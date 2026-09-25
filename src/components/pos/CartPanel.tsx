"use client";

import { useEffect, useState } from "react";
import type { CartItem, Product } from "@/types/store";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

const formatPriceInput = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(Number(value ?? 0));

export type CartPanelProps = {
  cart: CartItem[];
  products: Product[];
  onChangeQuantity: (productId: string, quantity: number) => void;
  onChangePrice: (productId: string, unitPrice: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  onClose?: () => void;
  onOpen?: () => void;
  subtotal: number;
  tax: number;
  total: number;
};

export default function CartPanel({
  cart,
  products,
  onChangeQuantity,
  onChangePrice,
  onRemove,
  onCheckout,
  onClose,
  onOpen,
  subtotal,
  tax,
  total,
}: CartPanelProps) {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};

    cart.forEach((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) return;

      const current = item.unitPrice ?? product.price;
      nextDrafts[item.productId] = String(current);
    });

    setPriceDrafts((previous) => ({
      ...previous,
      ...nextDrafts,
    }));
  }, [cart, products]);

  if (onOpen && !onClose) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-violet-400/60 bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-3 text-left text-white shadow-2xl shadow-violet-950/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg">🛒</div>
          <div>
            <p className="text-sm font-black leading-none">Ver Carrito de Compra</p>
            <p className="mt-1 text-[11px] text-violet-100">{itemCount} artículos seleccionados</p>
          </div>
        </div>

        <p className="text-xl font-black">{formatCurrency(total)}</p>
      </button>
    );
  }

  return (
    <div className="w-full max-w-xl rounded-[24px] border border-slate-700/80 bg-[#1f2d3d]/95 p-4 shadow-2xl shadow-slate-950/60 backdrop-blur-md flex flex-col max-h-[80vh]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[1.35rem] font-black text-white">Carrito de Ventas</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-2xl font-light text-slate-300 transition hover:text-white"
            aria-label="Cerrar carrito"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {cart.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/60 p-4 text-sm text-slate-300">
            No hay productos en el carrito.
          </p>
        ) : (
          cart
            .filter((item) => item.quantity > 0)
            .map((item) => {
              const product = products.find((entry) => entry.id === item.productId);

              if (!product) {
                return null;
              }

              return (
                <div key={item.productId} className="rounded-2xl border border-slate-600 bg-slate-900/40 p-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-white truncate">{product.name}</h3>
                      <p className="mt-1 text-[11px] text-slate-400">Stock: {product.stock} pzs</p>

                      <div className="mt-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            priceDrafts[item.productId] !== undefined
                              ? priceDrafts[item.productId]
                              : formatPriceInput(product.price)
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value.replace(/[^\d.]/g, "");
                            setPriceDrafts((previous) => ({
                              ...previous,
                              [item.productId]: nextValue,
                            }));

                            if (nextValue === "") {
                              return;
                            }

                            const parsed = Number(nextValue);
                            if (!Number.isNaN(parsed)) {
                              onChangePrice(item.productId, parsed);
                            }
                          }}
                          onBlur={() => {
                            const draft = priceDrafts[item.productId];
                            const parsed = draft === undefined || draft === "" ? product.price : Number(draft);

                            if (!Number.isFinite(parsed) || parsed < 0) {
                              setPriceDrafts((previous) => ({
                                ...previous,
                                [item.productId]: formatPriceInput(product.price),
                              }));
                              onChangePrice(item.productId, product.price);
                              return;
                            }

                            setPriceDrafts((previous) => ({
                              ...previous,
                              [item.productId]: formatPriceInput(parsed),
                            }));
                            onChangePrice(item.productId, parsed);
                          }}
                          className="mt-1 w-28 rounded-xl border border-violet-400 bg-transparent px-2 py-1 text-lg font-black text-emerald-300 outline-none focus:border-violet-300"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="inline-flex items-center rounded-xl border border-slate-600 bg-slate-800">
                        <button
                          type="button"
                          className="h-8 w-8 text-lg font-bold text-slate-200"
                          onClick={() => onChangeQuantity(item.productId, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="px-3 text-base font-black text-white">{item.quantity}</span>
                        <button
                          type="button"
                          className="h-8 w-8 text-lg font-bold text-slate-200"
                          onClick={() => onChangeQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemove(item.productId)}
                        className="h-8 w-8 rounded-xl border border-slate-600 bg-slate-800 text-slate-300 transition hover:border-violet-400 hover:text-violet-200"
                        aria-label={`Quitar ${product.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between text-[1.05rem] font-black text-white">
        <span>Total a Cobrar:</span>
        <span className="text-emerald-300">{formatCurrency(total)}</span>
        </div>

        <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={() => cart.forEach((item) => onRemove(item.productId))}
          className="flex-1 rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          Vaciar
        </button>
        <button
          type="button"
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="flex-[1.8] rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Confirmar Venta
        </button>
        </div>
      </div>
    </div>
  );
}
