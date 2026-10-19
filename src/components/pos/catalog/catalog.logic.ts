"use client";

import { useState } from "react";
import type { Product } from "@/types/store";

export function normalizeCatalogSearchText(value: string): string {
  return value
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterCatalogProducts(products: Product[], search: string): Product[] {
  if (!search.trim()) {
    return products.slice(0, 6);
  }

  const term = normalizeCatalogSearchText(search.trim());
  return products.filter((product) => {
    const searchableText = normalizeCatalogSearchText(
      [
        product.name,
        product.category,
        product.description,
        product.shortDescription,
        ...product.tags,
      ].join(" ")
    );
    return searchableText.includes(term);
  });
}

export function summarizeInventory(products: Product[]) {
  const totalInventoryCost = products.reduce(
    (sum, product) => sum + (product.cost ?? product.price * 0.7) * product.stock,
    0
  );
  const totalSaleValue = products.reduce(
    (sum, product) => sum + product.price * product.stock,
    0
  );
  const grossProfit = totalSaleValue - totalInventoryCost;
  const grossMarginPercent = totalSaleValue > 0 ? (grossProfit / totalSaleValue) * 100 : 0;
  const markupPercent = totalInventoryCost > 0 ? (grossProfit / totalInventoryCost) * 100 : 0;

  return {
    totalInventoryCost,
    totalSaleValue,
    grossProfit,
    grossMarginPercent,
    markupPercent,
    markupExcessPercent: Math.max(0, markupPercent - 100),
    markupExcessValue: Math.max(0, grossProfit - totalInventoryCost),
  };
}

export function useCatalogStockDrafts() {
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});

  return {
    getDraftQuantity: (productId: string) => draftQuantities[productId] ?? "1",
    updateDraftQuantity: (productId: string, value: string) => {
      setDraftQuantities((previous) => ({ ...previous, [productId]: value }));
    },
    resetDraftQuantity: (productId: string) => {
      setDraftQuantities((previous) => ({ ...previous, [productId]: "1" }));
    },
  };
}
