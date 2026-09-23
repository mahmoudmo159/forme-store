import { useEffect, useState } from "react";
import { listProducts, getProductBySlug, listCategories, type ProductFilters } from "../services/products.service";
import type { Product, ProductWithVariants } from "../types";

// Deliberately dependency-free (no react-query) so the storefront has
// zero extra runtime deps beyond @supabase/supabase-js — swap this for
// react-query/SWR later if you want caching/revalidation for free.

export function useProductList(filters: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listProducts(filters)
      .then((res) => {
        if (cancelled) return;
        setProducts(res.products);
        setTotal(res.total);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Failed to load products.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return { products, total, loading, error };
}

export function useProduct(slug: string | undefined) {
  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProductBySlug(slug)
      .then((p) => {
        if (!cancelled) setProduct(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Failed to load product.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { product, loading, error };
}

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);
  return categories;
}
