"use client";

import CartPanel from "@/components/CartPanel";
import ProductGrid from "@/components/ProductGrid";
import DashboardHeader from "@/components/DashboardHeader";
import EventManagementDialog from "@/components/EventManagementDialog";
import EventPerformancePanel from "@/components/EventPerformancePanel";
import InventorySummary from "@/components/InventorySummary";
import styles from "./pos.module.scss";
import { usePosDashboard } from "./pos.logic";

export default function PosDashboard() {
  const model = usePosDashboard();

  return (
    <main className={`${styles.scope} min-h-screen bg-slate-950 px-4 pb-32 pt-6 text-slate-100 xl:pb-8`}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <DashboardHeader model={model} />
          <EventPerformancePanel model={model} />
        </header>

        <EventManagementDialog model={model} />

        <InventorySummary model={model} />

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
          <input
            type="text"
            value={model.search}
            onChange={(event) => model.setSearch(event.target.value)}
            placeholder="Buscar producto, categoría o detalle..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr] xl:items-start">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Catálogo</h2>
              <span className="text-sm text-slate-400">
                {model.search.trim()
                  ? `${model.filteredProducts.length} resultados`
                  : "Vista rápida"}
              </span>
            </div>
            <ProductGrid
              products={model.filteredProducts}
              onAdd={model.handleAddToCart}
              onAddStock={model.handleAddStock}
            />
          </section>

          {model.hasCartItems && !model.isCartOpen && (
            <CartPanel
              cart={model.cart}
              products={model.productCatalog}
              onChangeQuantity={model.handleChangeQuantity}
              onChangePrice={model.handleChangePrice}
              onRemove={model.handleRemove}
              onCheckout={model.handleCheckout}
              onOpen={() => model.setIsCartOpen(true)}
              subtotal={model.totals.subtotal}
              tax={model.totals.tax}
              total={model.totals.total}
            />
          )}
        </div>

        {model.hasCartItems && model.isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl">
              <CartPanel
                cart={model.cart}
                products={model.productCatalog}
                onChangeQuantity={model.handleChangeQuantity}
                onChangePrice={model.handleChangePrice}
                onRemove={model.handleRemove}
                onCheckout={model.handleCheckout}
                onClose={() => model.setIsCartOpen(false)}
                subtotal={model.totals.subtotal}
                tax={model.totals.tax}
                total={model.totals.total}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
