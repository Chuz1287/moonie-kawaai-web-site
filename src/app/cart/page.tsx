import { calculateCartSummary } from "@/services/cart";

export default function CartPage() {
  const cart = [
    { productId: "prod-001", quantity: 2 },
    { productId: "prod-004", quantity: 1 },
  ];

  const summary = calculateCartSummary(cart);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-black text-zinc-900">Carrito</h1>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-zinc-600">Artículos: {summary.itemCount}</p>
        <p className="mt-2 text-zinc-600">Subtotal: ${summary.subtotal}</p>
        <p className="mt-2 text-zinc-600">Envío: ${summary.shipping}</p>
        <p className="mt-4 text-xl font-bold text-zinc-900">Total: ${summary.total}</p>
      </div>
    </main>
  );
}
