
import { useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { listProducts, getProduct, listAdminProducts, saveProduct, deleteProduct } from "./services/products.service";
import { placeOrder, getMyOrders, listAdminOrders, updateOrderStatus } from "./services/orders.service";
import { signIn, signUp, signOut } from "./services/auth.service";
import { getCustomerByAuthId, upsertCustomer, listCustomers } from "./services/customers.service";
import { useCart } from "./context/CartContext";
import { useAuth } from "./context/AuthContext";
import type { Product, Order } from "./types";

const money = (n:number) => `$${Number(n).toFixed(2)}`;

function Header() {
  const cart = useCart(); const { user, isAdmin } = useAuth();
  return <header className="header">
    <Link to="/" className="logo">FORME</Link>
    <nav>
      <Link to="/shop">Shop</Link><Link to="/shop?category=Men">Men</Link><Link to="/shop?category=Women">Women</Link>
      <Link to="/wishlist">Wishlist</Link><Link to="/account">{user ? "Account" : "Sign in"}</Link>
      {isAdmin && <Link to="/admin">Admin</Link>}
      <Link to="/cart">Bag ({cart.count})</Link>
    </nav>
  </header>
}

function Footer(){return <footer><div><b>FORME</b><p>Modern essentials, considered carefully.</p></div><div className="footerlinks"><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/faq">FAQ</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link></div></footer>}

function Layout({children}:{children:React.ReactNode}) { return <><Header/><main>{children}</main><Footer/></> }

function Home(){
  const [products,setProducts]=useState<Product[]>([]);
  useEffect(()=>{listProducts({featured:true}).then(setProducts).catch(console.error)},[]);
  return <Layout><section className="hero"><div><p className="eyebrow">FORME / COLLECTION 01</p><h1>Less, but better.</h1><p>Premium everyday pieces designed with restraint.</p><Link className="btn" to="/shop">SHOP COLLECTION</Link></div></section>
  <section className="section"><div className="sectionhead"><h2>Featured</h2><Link to="/shop">View all</Link></div><ProductGrid products={products}/></section></Layout>
}

function ProductGrid({products}:{products:Product[]}){return <div className="grid">{products.map(p=><Link className="card" to={`/product/${p.slug}`} key={p.id}><div className="photo">{p.main_image?<img src={p.main_image} alt={p.name}/>:<span>FORME</span>}</div><div className="cardmeta"><span>{p.name}</span><span>{money(p.price)}</span></div><small>{p.category}</small></Link>)}</div>}

function Shop(){
  const [products,setProducts]=useState<Product[]>([]); const [q,setQ]=useState(""); const [cat,setCat]=useState("all");
  useEffect(()=>{listProducts({category:cat,search:q}).then(setProducts).catch(console.error)},[cat,q]);
  return <Layout><section className="section top"><div className="sectionhead"><h1>Shop</h1><input placeholder="Search" value={q} onChange={e=>setQ(e.target.value)}/></div><div className="filters">{["all","Men","Women","Collections"].map(x=><button className={cat===x?"active":""} onClick={()=>setCat(x)} key={x}>{x}</button>)}</div><ProductGrid products={products}/></section></Layout>
}

function ProductPage(){
  const {slug}=useParams(); const [p,setP]=useState<Product|null>(null); const [variant,setVariant]=useState<string|null>(null); const [qty,setQty]=useState(1); const cart=useCart();
  useEffect(()=>{if(slug)getProduct(slug).then(x=>{setP(x); const first=x.variants?.find(v=>v.name.toLowerCase()==="size"); setVariant(first?.value??null)}).catch(console.error)},[slug]);
  if(!p)return <Layout><section className="section top"><p>Loading...</p></section></Layout>;
  return <Layout><section className="product"><div className="productphoto">{p.main_image?<img src={p.main_image} alt={p.name}/>:<span>FORME</span>}</div><div><p className="eyebrow">{p.category}</p><h1>{p.name}</h1><p className="price">{money(p.price)}</p><p className="muted">{p.description}</p>{p.variants?.length?<div className="variant"><b>Options</b><div>{p.variants.map(v=><button className={variant===v.value?"active":""} disabled={!v.stock} onClick={()=>setVariant(v.value)} key={v.id}>{v.value}</button>)}</div></div>:null}<div className="qty"><button onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span>{qty}</span><button onClick={()=>setQty(qty+1)}>+</button></div><button className="btn full" onClick={()=>cart.add(p,qty,variant)}>ADD TO BAG</button></div></section></Layout>
}

function Cart(){
  const cart=useCart(); return <Layout><section className="section top narrow"><h1>Your Bag</h1>{cart.items.length===0?<p className="muted">Your bag is empty.</p>:<>{cart.items.map((x,i)=><div className="line" key={i}><span>{x.product.name} · {x.variant||"Standard"}</span><span>{x.quantity} × {money(x.unitPrice)}</span><button onClick={()=>cart.remove(i)}>Remove</button></div>)}<div className="total"><b>Total</b><b>{money(cart.subtotal)}</b></div><Link className="btn" to="/checkout">CHECKOUT</Link></>}</section></Layout>
}

function Checkout(){
  const cart=useCart(); const {user}=useAuth(); const [form,setForm]=useState({name:"",email:"",phone:"",address:"",city:"",country:"Egypt",postal:""}); const [method,setMethod]=useState<"cod"|"card">("cod"); const [busy,setBusy]=useState(false); const [done,setDone]=useState<Order|null>(null);
  useEffect(()=>{if(user){getCustomerByAuthId(user.id).then(c=>c&&setForm(f=>({...f,name:c.name,email:c.email,phone:c.phone||""}))) }},[user]);
  if(!cart.items.length && !done)return <Layout><section className="section top narrow"><p>Your bag is empty.</p></section></Layout>;
  if(done)return <Layout><section className="section top narrow center"><p className="eyebrow">ORDER CONFIRMED</p><h1>Thank you.</h1><p>Order {done.order_number} has been created.</p><Link className="btn" to="/">CONTINUE SHOPPING</Link></section></Layout>;
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);try{
    let customerId:string|undefined;
    if(user){const c=await upsertCustomer({auth_user_id:user.id,name:form.name,email:form.email,phone:form.phone,address:form});customerId=c.id}
    const order=await placeOrder({customer:{id:customerId,name:form.name,email:form.email,phone:form.phone},shippingAddress:form,paymentMethod:method,items:cart.items});
    if(method==="card") alert("Card gateway is ready for provider integration. The order is currently pending payment.");
    cart.clear();setDone(order);
  }catch(err:any){alert(err.message||"Could not place order")}finally{setBusy(false)}}
  return <Layout><section className="section top checkout"><form onSubmit={submit}><h1>Checkout</h1>{["name","email","phone","address","city","country","postal"].map(k=><label key={k}>{k.toUpperCase()}<input required={k!=="phone"} value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<label>PAYMENT<select value={method} onChange={e=>setMethod(e.target.value as any)}><option value="cod">Cash on Delivery</option><option value="card">Card (gateway)</option></select></label><button className="btn full" disabled={busy}>{busy?"PLACING ORDER...":"PLACE ORDER"}</button></form><aside><h3>Summary</h3>{cart.items.map((x,i)=><p key={i}>{x.product.name} × {x.quantity} — {money(x.unitPrice*x.quantity)}</p>)}<hr/><b>{money(cart.subtotal)}</b></aside></section></Layout>
}

function Account(){
  const {user}=useAuth(); const [orders,setOrders]=useState<Order[]>([]); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState("");
  if(!user)return <Layout><section className="section top narrow"><h1>Account</h1><form onSubmit={async e=>{e.preventDefault();try{await signIn(email,password)}catch(err:any){alert(err.message)}}}><label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn">SIGN IN</button></form><hr/><form onSubmit={async e=>{e.preventDefault();try{await signUp(email,password,name);alert("Check your email if confirmation is enabled.")}catch(err:any){alert(err.message)}}}><h3>Create account</h3><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><button className="btn">CREATE ACCOUNT</button></form></section></Layout>;
  useEffect(()=>{getCustomerByAuthId(user.id).then(c=>c&&getMyOrders(c.id).then(setOrders)).catch(()=>{})},[user.id]);
  return <Layout><section className="section top narrow"><div className="sectionhead"><h1>Account</h1><button onClick={()=>signOut()}>Sign out</button></div><h3>Orders</h3>{orders.map(o=><div className="line" key={o.id}><span>{o.order_number}<small>{new Date(o.created_at).toLocaleDateString()}</small></span><span>{o.order_status} · {money(o.total)}</span></div>)}</section></Layout>
}

function Simple({title,children}:{title:string,children:React.ReactNode}){return <Layout><section className="section top narrow"><h1>{title}</h1>{children}</section></Layout>}

function Admin(){
  const {isAdmin}=useAuth(); const [tab,setTab]=useState("orders"); const [orders,setOrders]=useState<Order[]>([]); const [products,setProducts]=useState<Product[]>([]); const [customers,setCustomers]=useState<any[]>([]);
  useEffect(()=>{if(isAdmin){listAdminOrders().then(setOrders);listAdminProducts().then(setProducts);listCustomers().then(setCustomers)}},[isAdmin]);
  if(!isAdmin)return <Layout><section className="section top narrow"><h1>Admin</h1><p>Admin access required.</p></section></Layout>;
  return <Layout><section className="section top"><div className="sectionhead"><h1>Admin</h1><div className="tabs">{["orders","products","customers"].map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div></div>
    {tab==="orders"&&<div>{orders.map(o=><div className="line" key={o.id}><span><b>{o.order_number}</b><small>{o.customer_name} · {o.customer_email}</small></span><span>{money(o.total)} <select value={o.order_status} onChange={async e=>{const updated=await updateOrderStatus(o.id,e.target.value as any);setOrders(xs=>xs.map(x=>x.id===o.id?updated:x))}}>{["new","confirmed","preparing","shipped","delivered","cancelled"].map(s=><option key={s}>{s}</option>)}</select></span></div>)}</div>}
    {tab==="products"&&<div>{products.map(p=><div className="line" key={p.id}><span>{p.name}<small>{p.category} · stock {p.stock}</small></span><span>{money(p.price)} <button onClick={async()=>{await deleteProduct(p.id);setProducts(xs=>xs.filter(x=>x.id!==p.id))}}>Delete</button></span></div>)}<p className="muted">Product create/edit can be extended with your exact catalog fields; the Supabase service layer is already wired.</p></div>}
    {tab==="customers"&&<div>{customers.map(c=><div className="line" key={c.id}><span>{c.name}<small>{c.email}</small></span><span>{c.phone||"—"}</span></div>)}</div>}
  </section></Layout>
}

export default function App(){
 return <Routes><Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/product/:slug" element={<ProductPage/>}/><Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/account" element={<Account/>}/><Route path="/admin" element={<Admin/>}/><Route path="/wishlist" element={<Simple title="Wishlist"><p className="muted">Wishlist persistence can be added to the customer table/profile layer.</p></Simple>}/><Route path="/shipping" element={<Simple title="Shipping"><p>Standard shipping and free-shipping thresholds are controlled by store settings.</p></Simple>}/><Route path="/returns" element={<Simple title="Returns"><p>Unworn items may be returned according to your store policy.</p></Simple>}/><Route path="/faq" element={<Simple title="FAQ"><p>Contact the store for product, sizing and order questions.</p></Simple>}/><Route path="/contact" element={<Simple title="Contact"><p>Email your store contact address from Supabase store settings.</p></Simple>}/><Route path="/privacy" element={<Simple title="Privacy"><p>Publish your final privacy policy here before launch.</p></Simple>}/></Routes>
}
