"use client";

import type { Product } from "@/types/store";

export type ProductGridProps = {
  products: Product[];
  onAdd: (product: Product) => void;
};

export default function ProductGrid({ products, onAdd }: ProductGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => onAdd(product)}
          className="rounded-2xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md"
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

          <div className="mt-4 flex items-center justify-between">
            <span className="text-lg font-black text-zinc-900">${product.price}</span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Add
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
