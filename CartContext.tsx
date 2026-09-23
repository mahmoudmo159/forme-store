
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine, Product } from "../types";

type CartValue = {
  items: CartLine[];
  add: (product: Product, quantity?: number, variant?: string | null) => void;
  update: (index: number, quantity: number) => void;
  remove: (index: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartValue | null>(null);
const KEY = "forme_cart_v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(items)), [items]);

  const value = useMemo<CartValue>(() => ({
    items,
    add: (product, quantity = 1, variant = null) => setItems(prev => {
      const i = prev.findIndex(x => x.product.id === product.id && x.variant === variant);
      if (i >= 0) return prev.map((x, idx) => idx === i ? { ...x, quantity: x.quantity + quantity } : x);
      return [...prev, { product, quantity, variant, unitPrice: product.price }];
    }),
    update: (index, quantity) => setItems(prev => prev.map((x, i) => i === index ? { ...x, quantity: Math.max(1, quantity) } : x)),
    remove: index => setItems(prev => prev.filter((_, i) => i !== index)),
    clear: () => setItems([]),
    count: items.reduce((n, x) => n + x.quantity, 0),
    subtotal: items.reduce((n, x) => n + x.unitPrice * x.quantity, 0)
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const v = useContext(CartContext);
  if (!v) throw new Error("useCart must be inside CartProvider");
  return v;
}
