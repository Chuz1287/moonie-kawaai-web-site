import Link from "next/link";
import ProductCard from "@/components/common/ProductCard";
import { getFeaturedProducts, getProducts } from "@/services/catalog";

export default function HomePage() {
  const featured = getFeaturedProducts();
  const featuredList = getProducts();

  return (
    <main className="bg-zinc-50 text-zinc-900">
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-violet-500">
              Monie Kawaai
            </p>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-zinc-900">
              Todo lo que tu tienda necesita, en un solo ecosistema.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
              Un proyecto fullstack con POS y storefront compartiendo catálogo, stock,
              productos y operaciones desde una misma base de servicios.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                href="/product"
                className="rounded-full bg-zinc-900 px-6 py-3 font-semibold text-white transition hover:bg-zinc-700"
              >
                Ver catálogo
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-900 transition hover:border-zinc-400"
              >
                Conócenos
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-400 p-6 shadow-xl">
            <div className="rounded-[24px] bg-white/10 p-6 text-white backdrop-blur-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-violet-100">Dashboard</p>
              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-violet-100">Productos activos</p>
                  <p className="mt-2 text-3xl font-bold">{featuredList.length}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-violet-100">Stock disponible</p>
                  <p className="mt-2 text-3xl font-bold">
                    {featuredList.reduce((sum, item) => sum + item.stock, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-500">
              Destacados
            </p>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900">Productos favoritos</h2>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
