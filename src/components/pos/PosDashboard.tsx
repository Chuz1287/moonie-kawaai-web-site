"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addProductToCart,
  applyStockReduction,
  calculateCartTotals,
  createLocalSaleRecord,
  readLocalSales,
  removeProductFromCart,
  saveLocalSale,
  updateCartItemPrice,
  updateCartItemQuantity,
} from "@/services/pos";
import { syncSaleToSupabase } from "@/lib/supabase";
import type { CartItem, Product } from "@/types/store";
import CartPanel from "./CartPanel";
import ProductGrid from "./ProductGrid";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

export default function PosDashboard() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Listo para vender");
  const [eventName, setEventName] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("default");
  const [salesChannels, setSalesChannels] = useState<string[]>([]);
  const [productCatalog, setProductCatalog] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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

    const storedChannels = localStorage.getItem("moonie_kawaai_sales_channels");
    if (storedChannels) {
      try {
        const parsed = JSON.parse(storedChannels) as string[];
        if (!cancelled) {
          setSalesChannels(parsed);
          if (parsed.length > 0) {
            setSelectedEvent(parsed[0]);
          }
        }
      } catch {
        // ignore malformed local storage
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) {
      return productCatalog.slice(0, 6);
    }

    const term = search.toLowerCase();

    return productCatalog.filter((product) =>
      [product.name, product.category, product.shortDescription]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [productCatalog, search]);

  const inventorySummary = useMemo(() => {
    const totalInventoryCost = productCatalog.reduce(
      (sum, product) => sum + (product.cost ?? product.price * 0.7) * product.stock,
      0
    );
    const totalSaleValue = productCatalog.reduce(
      (sum, product) => sum + product.price * product.stock,
      0
    );
    const grossProfit = totalSaleValue - totalInventoryCost;
    const grossMarginPercent = totalSaleValue > 0 ? (grossProfit / totalSaleValue) * 100 : 0;
    const markupPercent = totalInventoryCost > 0 ? (grossProfit / totalInventoryCost) * 100 : 0;
    const markupExcessPercent = Math.max(0, markupPercent - 100);
    const markupExcessValue = Math.max(0, grossProfit - totalInventoryCost);

    return {
      totalInventoryCost,
      totalSaleValue,
      grossProfit,
      grossMarginPercent,
      markupPercent,
      markupExcessPercent,
      markupExcessValue,
    };
  }, [productCatalog]);

  const totals = useMemo(() => calculateCartTotals(cart, productCatalog), [cart, productCatalog]);
  const hasCartItems = cart.length > 0;

  const handleAddToCart = (product: { id: string; name: string }) => {
    setCart((current) => addProductToCart(current, product.id, 1));
    setStatus(`${product.name} agregado al carrito`);
  };

  const handleChangeQuantity = (productId: string, quantity: number) => {
    setCart((current) => updateCartItemQuantity(current, productId, quantity));
  };

  const handleChangePrice = (productId: string, unitPrice: number) => {
    setCart((current) => updateCartItemPrice(current, productId, unitPrice));
  };

  const handleRemove = (productId: string) => {
    setCart((current) => removeProductFromCart(current, productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setStatus("El carrito está vacío");
      return;
    }

    const sale = createLocalSaleRecord(cart, productCatalog, selectedEvent || "default");
    const updatedCatalog = applyStockReduction(cart, productCatalog);

    try {
      saveLocalSale(sale);
      const syncResult = await syncSaleToSupabase(sale);

      setProductCatalog(updatedCatalog);

      if (typeof window !== "undefined") {
        localStorage.setItem("moonie_kawaai_product_inventory", JSON.stringify(updatedCatalog));
      }

      const localSales = readLocalSales();
      setStatus(
        syncResult.synced > 0
          ? `Venta registrada y sincronizada (${localSales.length} locales, ${syncResult.synced} en Supabase)`
          : `Venta guardada localmente (${localSales.length} registros). ${syncResult.message}`
      );
    } catch (error) {
      saveLocalSale(sale);
      setProductCatalog(updatedCatalog);
      setStatus("Venta guardada localmente, pero no se pudo sincronizar con Supabase");
      console.error("Checkout sync failed", error);
    } finally {
      setCart([]);
      setIsCartOpen(false);
    }
  };

  const handleSaveChannel = () => {
    const normalized = eventName.trim();

    if (!normalized) {
      return;
    }

    setSalesChannels((current) => {
      const next = current.includes(normalized) ? current : [...current, normalized];
      localStorage.setItem("moonie_kawaai_sales_channels", JSON.stringify(next));
      setSelectedEvent(normalized);
      return next;
    });

    setEventName("");
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-32 pt-6 text-slate-100 xl:pb-8">
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
              <Link
                href="/sales"
                className="rounded-full border border-violet-400/60 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20"
              >
                Ventas
              </Link>
              <button
                type="button"
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-500"
              >
                Sincronizar
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
              {status}
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-800 p-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Canal de venta
              </label>
              <div className="flex gap-2">
                <input
                  value={eventName}
                  onChange={(event) => setEventName(event.target.value)}
                  placeholder="Nuevo canal"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveChannel}
                  className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white"
                >
                  +
                </button>
              </div>
              <select
                value={selectedEvent}
                onChange={(event) => setSelectedEvent(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="default">Default</option>
                {salesChannels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Costo total
            </p>
            <p className="mt-3 text-2xl font-black text-white">
              {formatCurrency(inventorySummary.totalInventoryCost)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Venta total
            </p>
            <p className="mt-3 text-2xl font-black text-emerald-300">
              {formatCurrency(inventorySummary.totalSaleValue)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Ganancia bruta
            </p>
            <p className="mt-3 text-2xl font-black text-violet-300">
              {formatCurrency(inventorySummary.grossProfit)}
            </p>
            <div className="mt-3 space-y-1 text-xs text-slate-300">
              <p>
                Margen bruto: <span className="font-bold text-violet-200">{inventorySummary.grossMarginPercent.toFixed(1)}%</span>
              </p>
              <p>
                Markup sobre costo: <span className="font-bold text-emerald-300">{inventorySummary.markupPercent.toFixed(1)}%</span>
              </p>
              {inventorySummary.markupExcessPercent > 0 && (
                <p>
                  Exceso sobre 100%: <span className="font-bold text-amber-300">{inventorySummary.markupExcessPercent.toFixed(1)}%</span> / <span className="font-bold text-amber-300">{formatCurrency(inventorySummary.markupExcessValue)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto, categoría o detalle..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr] xl:items-start">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Catálogo</h2>
              <span className="text-sm text-slate-400">
                {search.trim() ? `${filteredProducts.length} resultados` : "Vista rápida"}
              </span>
            </div>
            <ProductGrid products={filteredProducts} onAdd={handleAddToCart} />
          </section>

          {hasCartItems && !isCartOpen && (
            <CartPanel
              cart={cart}
              products={productCatalog}
              onChangeQuantity={handleChangeQuantity}
              onChangePrice={handleChangePrice}
              onRemove={handleRemove}
              onCheckout={handleCheckout}
              onOpen={() => setIsCartOpen(true)}
              subtotal={totals.subtotal}
              tax={totals.tax}
              total={totals.total}
            />
          )}
        </div>

        {hasCartItems && isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl">
              <CartPanel
                cart={cart}
                products={productCatalog}
                onChangeQuantity={handleChangeQuantity}
                onChangePrice={handleChangePrice}
                onRemove={handleRemove}
                onCheckout={handleCheckout}
                onClose={() => setIsCartOpen(false)}
                subtotal={totals.subtotal}
                tax={totals.tax}
                total={totals.total}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
