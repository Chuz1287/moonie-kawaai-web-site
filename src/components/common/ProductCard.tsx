import Link from "next/link";
import type { Product } from "@/types/store";

export type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Link href={`/product/${product.slug}`} className="block">
        <img
          src={product.image}
          alt={product.name}
          className="h-52 w-full rounded-xl object-cover"
        />
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
            {product.category}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-zinc-900">{product.name}</h3>
        </div>
        <span className="text-lg font-bold text-zinc-900">${product.price}</span>
      </div>

      <p className="mt-3 text-sm text-zinc-600">{product.shortDescription}</p>

      <div className="mt-4 flex items-center justify-between">
        <Link
          href={`/product/${product.slug}`}
          className="text-sm font-semibold text-violet-600 hover:text-violet-800"
        >
          Ver detalle
        </Link>
        <button
          type="button"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          Agregar
        </button>
      </div>
    </article>
  );
}
