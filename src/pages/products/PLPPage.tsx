import ProductCard from "@/components/common/ProductCard";
import { getProducts } from "@/services/catalog";

export default function PLPPage() {
  const products = getProducts();

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-500">
          Catálogo
        </p>
        <h1 className="mt-3 text-4xl font-black text-zinc-900">Productos</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}
