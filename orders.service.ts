
import { supabase } from "../lib/supabase";
import type { CartLine, Order } from "../types";

export async function placeOrder(input: {
  customer?: { id?: string | null; name: string; email: string; phone?: string };
  shippingAddress: Record<string, unknown>;
  paymentMethod: "cod" | "card";
  items: CartLine[];
  couponCode?: string;
}) {
  const payload = {
    p_customer_id: input.customer?.id ?? null,
    p_customer_name: input.customer?.name ?? "",
    p_customer_email: input.customer?.email ?? "",
    p_customer_phone: input.customer?.phone ?? null,
    p_shipping_address: input.shippingAddress,
    p_payment_method: input.paymentMethod,
    p_coupon_code: input.couponCode || null,
    p_items: input.items.map(x => ({
      product_id: x.product.id,
      quantity: x.quantity,
      variant: x.variant
    }))
  };
  const { data, error } = await supabase.rpc("place_order_atomic", payload);
  if (error) throw error;
  return data as Order;
}

export async function getMyOrders(customerId: string) {
  const { data, error } = await supabase.from("orders")
    .select("*, order_items(*)").eq("customer_id", customerId).order("created_at", { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function listAdminOrders() {
  const { data, error } = await supabase.from("orders")
    .select("*, order_items(*)").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function updateOrderStatus(id: string, order_status: Order["order_status"]) {
  const { data, error } = await supabase.from("orders").update({ order_status }).eq("id", id).select().single();
  if (error) throw error;
  return data as Order;
}
