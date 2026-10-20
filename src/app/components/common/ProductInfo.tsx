import type { Product } from "@/types/store";

export type ProductInfoProps = {
  product: Product;
};

export default function ProductInfo({ product }: ProductInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-500">
          {product.category}
        </p>
        <h1 className="mt-3 text-4xl font-bold text-zinc-900">{product.name}</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-3xl font-bold text-zinc-900">${product.price}</span>
        {product.compareAtPrice ? (
          <span className="text-lg text-zinc-400 line-through">
            ${product.compareAtPrice}
          </span>
        ) : null}
      </div>

      <p className="text-base leading-7 text-zinc-600">{product.description}</p>

      <div className="flex gap-3 text-sm text-zinc-600">
        <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700">
          {product.stock} en stock
        </span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
          Envío seguro
        </span>
      </div>
    </div>
  );
}
