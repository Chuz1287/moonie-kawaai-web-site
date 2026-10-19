"use client";

import { useState } from "react";

export const formatCartCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

export const formatCartPriceInput = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(Number(value ?? 0));

export function useCartPriceDrafts(
  onChangePrice: (productId: string, unitPrice: number) => void
) {
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const updateDraft = (productId: string, value: string) => {
    const nextValue = value.replace(/[^\d.]/g, "");
    setPriceDrafts((previous) => ({ ...previous, [productId]: nextValue }));

    if (nextValue !== "") {
      const parsed = Number(nextValue);
      if (!Number.isNaN(parsed)) {
        onChangePrice(productId, parsed);
      }
    }
  };

  const commitDraft = (productId: string, fallbackPrice: number) => {
    const draft = priceDrafts[productId];
    const parsed = draft === undefined || draft === "" ? fallbackPrice : Number(draft);

    if (!Number.isFinite(parsed) || parsed < 0) {
      setPriceDrafts((previous) => ({
        ...previous,
        [productId]: formatCartPriceInput(fallbackPrice),
      }));
      onChangePrice(productId, fallbackPrice);
      return;
    }

    setPriceDrafts((previous) => ({
      ...previous,
      [productId]: formatCartPriceInput(parsed),
    }));
    onChangePrice(productId, parsed);
  };

  const clearDraft = (productId: string) => {
    setPriceDrafts((previous) => {
      const next = { ...previous };
      delete next[productId];
      return next;
    });
  };

  return { priceDrafts, updateDraft, commitDraft, clearDraft };
}
