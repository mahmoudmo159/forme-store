
export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category: string;
  stock: number;
  sku: string | null;
  main_image: string | null;
  images: string[];
  status: "active" | "draft" | "archived";
  featured: boolean;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  value: string;
  price: number | null;
  stock: number;
  sku: string | null;
};

export type Customer = {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  address: Record<string, unknown> | null;
  created_at: string;
};

export type OrderItem = {
  id?: string;
  order_id?: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  variant: string | null;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: Record<string, unknown>;
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: "cod" | "card" | "other";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  order_status: "new" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
};

export type CartLine = {
  product: Product;
  quantity: number;
  variant: string | null;
  unitPrice: number;
};

export type StoreSettings = {
  id: number;
  store_name: string;
  logo_url: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  social_links: Record<string, string>;
  currency: string;
  shipping_cost: number;
  free_shipping_threshold: number;
  store_active: boolean;
};
