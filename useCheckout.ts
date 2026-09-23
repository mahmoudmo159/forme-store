import { useState } from "react";
import { placeOrder, StockError } from "../services/orders.service";
import type { CartLine, CheckoutInput, Order, OrderItem } from "../types";

export function useCheckout() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (cart: CartLine[], input: CheckoutInput): Promise<{ order: Order; items: OrderItem[] } | null> => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await placeOrder(cart, input);
      return result;
    } catch (e) {
      if (e instanceof StockError) {
        setError(e.message);
      } else if (e instanceof Error) {
        setError("We couldn't place your order. Please check your details and try again.");
        // eslint-disable-next-line no-console
        console.error(e);
      } else {
        setError("Something went wrong. Please try again.");
      }
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, error };
}
