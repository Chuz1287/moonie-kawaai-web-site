import type { Product } from "@/types/store";

export type ProductGalleryProps = {
  product: Product;
};

export default function ProductGallery({ product }: ProductGalleryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_120px]">
      <img
        src={product.image}
        alt={product.name}
        className="h-[520px] w-full rounded-2xl object-cover shadow-sm"
      />

      <div className="grid gap-3">
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
