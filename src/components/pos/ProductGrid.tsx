"use client";

import { useState } from "react";
import type { Product } from "@/types/store";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

export type ProductGridProps = {
  products: Product[];
  onAdd: (product: Product) => void;
  onAddStock: (product: Product, quantity: number) => void;
};

export default function ProductGrid({ products, onAdd, onAddStock }: ProductGridProps) {
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {products.map((product) => {
        const cost = product.cost ?? product.price * 0.7;
        const quantityDraft = draftQuantities[product.id] ?? "1";

        return (
          <div
            key={product.id}
            className="rounded-2xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => onAdd(product)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                    {product.category}
                  </p>
                  <h3 className="mt-2 text-base font-bold text-zinc-900">{product.name}</h3>
                </div>
                <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
                  {product.stock}
                </span>
              </div>

              <p className="mt-3 text-sm text-zinc-500">{product.shortDescription}</p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Venta</span>
                  <span className="font-black text-zinc-900">{formatCurrency(product.price)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Costo</span>
                  <span className="font-semibold text-amber-700">{formatCurrency(cost)}</span>
                </div>
              </div>
            </button>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddStock(product, 1);
                  }}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 transition hover:bg-emerald-100"
                >
                  +1
                </button>

                <div className="flex items-center rounded-lg border border-sky-200 bg-sky-50 px-2 py-1">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantityDraft}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setDraftQuantities((previous) => ({
                        ...previous,
                        [product.id]: nextValue,
                      }));
                    }}
                    className="w-12 bg-transparent text-center text-[10px] font-bold text-sky-800 outline-none"
                    aria-label={`Cantidad para agregar stock de ${product.name}`}
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const parsed = Number(quantityDraft || "1");
                      if (Number.isFinite(parsed) && parsed > 0) {
                        onAddStock(product, parsed);
                        setDraftQuantities((previous) => ({
                          ...previous,
                          [product.id]: "1",
                        }));
                      }
                    }}
                    className="ml-1 text-[10px] font-bold uppercase tracking-[0.15em] text-sky-700"
                  >
                    OK
                  </button>
                </div>
              </div>

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Agregar stock
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
