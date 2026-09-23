import { supabase } from "../lib/supabase";

const BUCKET = "product-images";

/**
 * Uploads a product image file to Supabase Storage and returns its
 * public URL. Only succeeds for signed-in admins (see storage RLS
 * policies in supabase/schema.sql).
 */
export async function uploadProductImage(file: File, productSlug: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${productSlug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProductImage(publicUrl: string): Promise<void> {
  // Extract the storage path from a public URL of the form
  // https://<project>.supabase.co/storage/v1/object/public/product-images/<path>
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
