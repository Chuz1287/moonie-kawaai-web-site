"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addProductToCart,
  calculateCartTotals,
  createLocalSaleRecord,
  readLocalSales,
  removeProductFromCart,
  saveLocalSale,
  updateCartItemQuantity,
} from "@/services/pos";
import type { CartItem, Product } from "@/types/store";
import CartPanel from "./CartPanel";
import ProductGrid from "./ProductGrid";

export default function PosDashboard() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Listo para vender");
  const [productCatalog, setProductCatalog] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products");
        const payload = (await response.json()) as { products?: Product[] };

        if (!cancelled) {
          setProductCatalog(payload.products ?? []);
          setStatus("Catálogo cargado desde Supabase");
        }
      } catch {
        if (!cancelled) {
          setStatus("No se pudo cargar el catálogo desde Supabase");
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return productCatalog;

    const term = search.toLowerCase();

    return productCatalog.filter((product) =>
      [product.name, product.category, product.shortDescription]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [productCatalog, search]);

  const totals = useMemo(() => calculateCartTotals(cart, productCatalog), [cart, productCatalog]);

  const handleAddToCart = (product: { id: string; name: string }) => {
    setCart((current) => addProductToCart(current, product.id, 1));
    setStatus(`${product.name} agregado al carrito`);
  };

  const handleChangeQuantity = (productId: string, quantity: number) => {
    setCart((current) => updateCartItemQuantity(current, productId, quantity));
  };

  const handleRemove = (productId: string) => {
    setCart((current) => removeProductFromCart(current, productId));
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setStatus("El carrito está vacío");
      return;
    }

    const sale = createLocalSaleRecord(cart, productCatalog, "default");
    saveLocalSale(sale);

    const localSales = readLocalSales();
    setStatus(`Venta guardada localmente (${localSales.length} registros)`);
    setCart([]);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
                POS - Fase 1
              </p>
              <h1 className="mt-2 text-3xl font-black text-white">Monie Kawaai POS</h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                Sincronización activa
              </span>
              <button
                type="button"
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-500"
              >
                Sincronizar
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
            {status}
          </div>
        </header>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto, categoría o detalle..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Catálogo</h2>
              <span className="text-sm text-slate-400">{filteredProducts.length} productos</span>
            </div>
            <ProductGrid products={filteredProducts} onAdd={handleAddToCart} />
          </section>

          <CartPanel
            cart={cart}
            products={productCatalog}
            onChangeQuantity={handleChangeQuantity}
            onRemove={handleRemove}
            onCheckout={handleCheckout}
            subtotal={totals.subtotal}
            tax={totals.tax}
            total={totals.total}
          />
        </div>
      </div>
    </main>
  );
}
