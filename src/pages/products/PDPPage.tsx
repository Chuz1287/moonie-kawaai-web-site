"use client";

import { useEffect, useState } from "react";
import AddToCartButton from "@/components/common/AddToCartButton";
import ProductGallery from "@/components/common/ProductGallery";
import ProductInfo from "@/components/common/ProductInfo";
import QuantitySelector from "@/components/common/QuantitySelector";
import type { Product } from "@/types/store";

export type PDPPageProps = {
  slug: string;
};

export default function PDPPage({ slug }: PDPPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        const response = await fetch("/api/products");
        const payload = (await response.json()) as { products?: Product[] };

        if (!cancelled) {
          const found = (payload.products ?? []).find((item) => item.slug === slug);
          setProduct(found ?? null);
        }
      } catch {
        if (!cancelled) {
          setProduct(null);
        }
      }
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!product) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-zinc-900">Producto no encontrado</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <ProductGallery product={product} />

        <div className="space-y-6">
          <ProductInfo product={product} />

          <div className="flex flex-wrap items-center gap-4">
            <QuantitySelector value={quantity} onChange={setQuantity} min={1} />
            <AddToCartButton quantity={quantity} onClick={() => undefined} />
          </div>
        </div>
      </div>
    </main>
  );
}
