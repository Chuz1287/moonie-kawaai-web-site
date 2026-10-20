import type { Product } from "@/types/store";
import { useState } from "react";

export type ProductGridProps = {
  products: Product[];
  onAdd: (product: Product) => void;
  onAddStock: (product: Product, quantity: number) => void;
};

// Hook para manejar cambios de cantidad temporal antes de confirmar
export function useCatalogStockDrafts() {
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});

  return {
    getDraftQuantity: (productId: string) => stockDrafts[productId] ?? 0,
    updateDraftQuantity: (productId: string, quantity: number) => {
      setStockDrafts((prev) => {
        const next = { ...prev };
        if (quantity <= 0) {
          delete next[productId];
        } else {
          next[productId] = quantity;
        }
        return next;
      });
    },
    resetDraftQuantity: (productId: string) => {
      setStockDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    },
    stockDrafts,
  };
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
