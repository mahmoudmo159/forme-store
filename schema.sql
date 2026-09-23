
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null, full_name text, role text not null default 'admin'
    check (role in ('admin','superadmin')), created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null, email text not null unique, phone text, address jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_customers_email on public.customers(email);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(), name text not null, slug text not null unique,
  description text, price numeric(10,2) not null check(price>=0),
  compare_at_price numeric(10,2), category text not null, stock integer not null default 0 check(stock>=0),
  sku text unique, main_image text, images text[] default '{}',
  status text not null default 'active' check(status in ('active','draft','archived')),
  featured boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_category on public.products(category);

create table if not exists public.product_variants (
  id uuid primary key default uuid_generate_v4(), product_id uuid not null references public.products(id) on delete cascade,
  name text not null, value text not null, price numeric(10,2), stock integer not null default 0 check(stock>=0),
  sku text unique, created_at timestamptz not null default now()
);
create index if not exists idx_variants_product on public.product_variants(product_id);

create table if not exists public.coupons (
  id uuid primary key default uuid_generate_v4(), code text not null unique,
  discount_type text not null check(discount_type in ('percent','fixed')),
  discount_value numeric(10,2) not null check(discount_value>0),
  min_order numeric(10,2) not null default 0, max_uses integer,
  used_count integer not null default 0, starts_at timestamptz default now(), expires_at timestamptz,
  active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(), order_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null, customer_email text not null, customer_phone text,
  shipping_address jsonb not null, subtotal numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0, discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  coupon_code text, payment_method text not null default 'cod' check(payment_method in ('cod','card','other')),
  payment_status text not null default 'pending' check(payment_status in ('pending','paid','failed','refunded')),
  order_status text not null default 'new' check(order_status in ('new','confirmed','preparing','shipped','delivered','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null, product_name text not null,
  quantity integer not null check(quantity>0), unit_price numeric(10,2) not null,
  total numeric(10,2) not null, variant text
);
create index if not exists idx_order_items_order on public.order_items(order_id);

create table if not exists public.store_settings (
  id int primary key default 1, store_name text not null default 'FORME', logo_url text,
  description text, contact_email text, contact_phone text, social_links jsonb default '{}',
  currency text not null default 'USD', shipping_cost numeric(10,2) not null default 12,
  free_shipping_threshold numeric(10,2) not null default 150, store_active boolean not null default true,
  updated_at timestamptz not null default now(), constraint single_row check(id=1)
);
insert into public.store_settings(id) values(1) on conflict(id) do nothing;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists trg_settings_updated on public.store_settings;
create trigger trg_settings_updated before update on public.store_settings for each row execute function public.set_updated_at();

create sequence if not exists public.order_number_seq start 10001;
create or replace function public.generate_order_number() returns text language plpgsql as $$
begin return 'FORME-'||nextval('public.order_number_seq')::text; end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public as $$
select exists(select 1 from public.admin_users where id=auth.uid()) $$;

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admin_users enable row level security;
alter table public.coupons enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists "products_read" on public.products;
create policy "products_read" on public.products for select using(status='active' or public.is_admin());
drop policy if exists "products_admin" on public.products;
create policy "products_admin" on public.products for all using(public.is_admin()) with check(public.is_admin());

drop policy if exists "variants_read" on public.product_variants;
create policy "variants_read" on public.product_variants for select using(true);
drop policy if exists "variants_admin" on public.product_variants;
create policy "variants_admin" on public.product_variants for all using(public.is_admin()) with check(public.is_admin());

drop policy if exists "customers_self_read" on public.customers;
create policy "customers_self_read" on public.customers for select using(auth_user_id=auth.uid() or public.is_admin());
drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers for insert with check(auth_user_id=auth.uid() or auth_user_id is null or public.is_admin());
drop policy if exists "customers_self_update" on public.customers;
create policy "customers_self_update" on public.customers for update using(auth_user_id=auth.uid() or public.is_admin()) with check(auth_user_id=auth.uid() or public.is_admin());
drop policy if exists "customers_admin_delete" on public.customers;
create policy "customers_admin_delete" on public.customers for delete using(public.is_admin());

drop policy if exists "orders_read" on public.orders;
create policy "orders_read" on public.orders for select using(
 public.is_admin() or customer_id in(select id from public.customers where auth_user_id=auth.uid())
);
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders for insert with check(false);
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders for update using(public.is_admin()) with check(public.is_admin());
drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete" on public.orders for delete using(public.is_admin());

drop policy if exists "items_read" on public.order_items;
create policy "items_read" on public.order_items for select using(
 public.is_admin() or order_id in(select o.id from public.orders o join public.customers c on c.id=o.customer_id where c.auth_user_id=auth.uid())
);
drop policy if exists "items_insert" on public.order_items;
create policy "items_insert" on public.order_items for insert with check(false);
drop policy if exists "items_admin_update" on public.order_items;
create policy "items_admin_update" on public.order_items for update using(public.is_admin()) with check(public.is_admin());
drop policy if exists "items_admin_delete" on public.order_items;
create policy "items_admin_delete" on public.order_items for delete using(public.is_admin());

drop policy if exists "admin_users_self" on public.admin_users;
create policy "admin_users_self" on public.admin_users for select using(id=auth.uid() or public.is_admin());

drop policy if exists "coupons_read" on public.coupons;
create policy "coupons_read" on public.coupons for select using(active=true or public.is_admin());
drop policy if exists "coupons_admin" on public.coupons;
create policy "coupons_admin" on public.coupons for all using(public.is_admin()) with check(public.is_admin());

drop policy if exists "settings_read" on public.store_settings;
create policy "settings_read" on public.store_settings for select using(true);
drop policy if exists "settings_admin" on public.store_settings;
create policy "settings_admin" on public.store_settings for update using(public.is_admin()) with check(public.is_admin());

create or replace function public.place_order_atomic(
 p_customer_id uuid, p_customer_name text, p_customer_email text, p_customer_phone text,
 p_shipping_address jsonb, p_payment_method text, p_coupon_code text, p_items jsonb
) returns public.orders
language plpgsql security definer set search_path=public as $$
declare
 it jsonb; prod public.products%rowtype; ord public.orders%rowtype;
 subtotal numeric:=0; discount numeric:=0; ship numeric:=0; total numeric:=0;
 q integer; unit numeric; variant text; coupon public.coupons%rowtype;
begin
 if jsonb_array_length(p_items)=0 then raise exception 'Cart is empty'; end if;
 for it in select * from jsonb_array_elements(p_items) loop
   q := (it->>'quantity')::int; variant := nullif(it->>'variant','');
   if q<=0 then raise exception 'Invalid quantity'; end if;
   select * into prod from public.products where id=(it->>'product_id')::uuid and status='active' for update;
   if not found then raise exception 'Product unavailable'; end if;
   if prod.stock < q then raise exception 'Insufficient stock for %',prod.name; end if;
   unit:=prod.price;
   subtotal:=subtotal+(unit*q);
 end loop;
 if p_coupon_code is not null and length(trim(p_coupon_code))>0 then
   select * into coupon from public.coupons where upper(code)=upper(trim(p_coupon_code)) and active=true
   and (starts_at is null or starts_at<=now()) and (expires_at is null or expires_at>=now())
   and (max_uses is null or used_count<max_uses) for update;
   if not found then raise exception 'Invalid or expired coupon'; end if;
   if subtotal<coupon.min_order then raise exception 'Minimum order for coupon is %',coupon.min_order; end if;
   if coupon.discount_type='percent' then discount:=round(subtotal*coupon.discount_value/100,2);
   else discount:=least(coupon.discount_value,subtotal); end if;
 end if;
 select case when subtotal-discount >= free_shipping_threshold then 0 else shipping_cost end into ship
 from public.store_settings where id=1;
 total:=subtotal-discount+ship;
 insert into public.orders(order_number,customer_id,customer_name,customer_email,customer_phone,shipping_address,subtotal,shipping_cost,discount,total,coupon_code,payment_method)
 values(generate_order_number(),p_customer_id,p_customer_name,p_customer_email,p_customer_phone,p_shipping_address,subtotal,ship,discount,total,p_coupon_code,p_payment_method)
 returning * into ord;
 for it in select * from jsonb_array_elements(p_items) loop
   q:=(it->>'quantity')::int; variant:=nullif(it->>'variant','');
   select * into prod from public.products where id=(it->>'product_id')::uuid for update;
   insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,total,variant)
   values(ord.id,prod.id,prod.name,q,prod.price,prod.price*q,variant);
   update public.products set stock=stock-q where id=prod.id;
   if p_coupon_code is not null then update public.coupons set used_count=used_count+1 where id=coupon.id; end if;
 end loop;
 return ord;
end $$;

grant execute on function public.place_order_atomic(uuid,text,text,text,jsonb,text,text,jsonb) to anon, authenticated;

insert into storage.buckets(id,name,public) values('product-images','product-images',true)
on conflict(id) do nothing;
