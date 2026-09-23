
import { supabase } from "../lib/supabase";
import type { Product, ProductVariant } from "../types";

export async function listProducts(opts?: {
  category?: string;
  featured?: boolean;
  search?: string;
}) {
  let q = supabase.from("products").select("*, product_variants(*)").eq("status", "active").order("created_at", { ascending: false });
  if (opts?.category && opts.category !== "all") q = q.eq("category", opts.category);
  if (opts?.featured) q = q.eq("featured", true);
  if (opts?.search) q = q.ilike("name", `%${opts.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((p: any) => ({ ...p, variants: p.product_variants ?? [] })) as Product[];
}

export async function getProduct(slug: string) {
  const { data, error } = await supabase.from("products")
    .select("*, product_variants(*)")
    .eq("slug", slug).eq("status", "active").single();
  if (error) throw error;
  return { ...data, variants: (data as any).product_variants ?? [] } as Product;
}

export async function listAdminProducts() {
  const { data, error } = await supabase.from("products").select("*, product_variants(*)").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({ ...p, variants: p.product_variants ?? [] })) as Product[];
}

export async function saveProduct(product: Partial<Product>, variants: Partial<ProductVariant>[] = []) {
  const { data, error } = await supabase.from("products").upsert(product).select().single();
  if (error) throw error;
  if (variants.length) {
    const rows = variants.map(v => ({ ...v, product_id: data.id }));
    const { error: ve } = await supabase.from("product_variants").upsert(rows);
    if (ve) throw ve;
  }
  return data as Product;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
