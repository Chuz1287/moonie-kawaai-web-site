export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-500">
        Nosotros
      </p>
      <h1 className="mt-4 text-4xl font-black text-zinc-900">Un proyecto pensado para crecer.</h1>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-bold text-zinc-900">POS</h2>
          <p className="mt-3 text-zinc-600">
            Venta rápida, control de stock y sincronización del catálogo desde un único flujo.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-bold text-zinc-900">Site</h2>
          <p className="mt-3 text-zinc-600">
            Catálogo visible para clientes con páginas de producto y experiencia de compra clara.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-bold text-zinc-900">Backend</h2>
          <p className="mt-3 text-zinc-600">
            APIs internas y servicios compartidos para mantener integridad del producto y stock.
          </p>
        </div>
      </div>
    </main>
  );
}
