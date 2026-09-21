"use client";

import type { CartItem, Product } from "@/types/store";

export type CartPanelProps = {
  cart: CartItem[];
  products: Product[];
  onChangeQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  subtotal: number;
  tax: number;
  total: number;
};

export default function CartPanel({
  cart,
  products,
  onChangeQuantity,
  onRemove,
  onCheckout,
  subtotal,
  tax,
  total,
}: CartPanelProps) {
  return (
    <aside className="rounded-3xl border border-zinc-200 bg-zinc-100 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-zinc-900">Carrito</h2>
        <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
          {cart.reduce((sum, item) => sum + item.quantity, 0)} items
        </span>
      </div>

      <div className="space-y-3">
        {cart.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
            No hay productos en el carrito.
          </p>
        ) : (
          cart.map((item) => {
            const product = products.find((entry) => entry.id === item.productId);

            if (!product) {
              return null;
            }

            return (
              <div
                key={item.productId}
                className="rounded-2xl border border-zinc-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-zinc-900">{product.name}</h3>
                    <p className="text-sm text-zinc-500">${product.price} c/u</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.productId)}
                    className="text-xs font-bold text-rose-600"
                  >
                    Quitar
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50">
                    <button
                      type="button"
                      className="h-9 w-9 text-lg font-bold text-zinc-700"
                      onClick={() => onChangeQuantity(item.productId, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-9 text-center text-sm font-bold text-zinc-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="h-9 w-9 text-lg font-bold text-zinc-700"
                      onClick={() => onChangeQuantity(item.productId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>

                  <strong className="text-base font-black text-zinc-900">
                    ${(product.price * item.quantity).toFixed(2)}
                  </strong>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 space-y-3 border-t border-zinc-200 pt-4">
        <div className="flex items-center justify-between text-sm text-zinc-600">
          <span>Subtotal</span>
          <strong>${subtotal.toFixed(2)}</strong>
        </div>
        <div className="flex items-center justify-between text-sm text-zinc-600">
          <span>IVA</span>
          <strong>${tax.toFixed(2)}</strong>
        </div>
        <div className="flex items-center justify-between text-lg font-black text-zinc-900">
          <span>Total</span>
          <strong>${total.toFixed(2)}</strong>
        </div>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={cart.length === 0}
        className="mt-6 w-full rounded-full bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        Confirmar venta
      </button>
    </aside>
  );
}
