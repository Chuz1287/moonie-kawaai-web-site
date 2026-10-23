import type { CartItem, Product } from "@/types/store";
import { useState } from "react";

export type CartPanelProps = {
  cart: CartItem[];
  products: Product[];
  onChangeQuantity: (productId: string, quantity: number) => void;
  onChangePrice: (productId: string, unitPrice: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  onClose?: () => void;
  onOpen?: () => void;
  subtotal: number;
  tax: number;
  total: number;
};

// Hook para manejar cambios de precio temporal antes de confirmar
export function useCartPriceDrafts(onChangePrice: (productId: string, price: number) => void) {
  const [priceDrafts, setPriceDrafts] = useState<Record<string, number>>({});

  return {
    priceDrafts,
    updateDraft: (productId: string, price: number) => {
      setPriceDrafts((prev) => ({ ...prev, [productId]: price }));
    },
    commitDraft: (productId: string) => {
      if (priceDrafts[productId] !== undefined) {
        onChangePrice(productId, priceDrafts[productId]);
      }
    },
    clearDraft: (productId: string) => {
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    },
  };
}

export const formatCartCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

export const formatCartPriceInput = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
};
