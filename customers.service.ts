
import { supabase } from "../lib/supabase";
export async function getCustomerByAuthId(authUserId: string) {
  const { data, error } = await supabase.from("customers").select("*").eq("auth_user_id", authUserId).maybeSingle();
  if (error) throw error;
  return data;
}
export async function upsertCustomer(input: { auth_user_id: string; name: string; email: string; phone?: string; address?: any }) {
  const { data, error } = await supabase.from("customers").upsert(input, { onConflict: "email" }).select().single();
  if (error) throw error;
  return data;
}
export async function listCustomers() {
  const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
