"use client";

import type { Product } from "@/types/store";
import styles from "./ProductGallery.module.scss";

export type ProductGalleryProps = {
  product: Product;
};

export default function ProductGallery({ product }: ProductGalleryProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <img
        src={product.image}
        alt={product.name}
        className="flex-1 h-[520px] min-w-[300px] rounded-2xl object-cover shadow-sm"
      />

      <div className="flex flex-wrap gap-3">
        {product.gallery.map((image, index) => (
          <img
            key={`${product.id}-${index}`}
            src={image}
            alt={`${product.name} view ${index + 1}`}
            className="h-28 w-full rounded-xl object-cover border border-zinc-200"
          />
        ))}
      </div>
    </div>
  );
}
