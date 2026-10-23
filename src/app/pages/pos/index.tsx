"use client";

import CartPanel from "@/components/CartPanel";
import ProductGrid from "@/components/ProductGrid";
import DashboardHeader from "@/components/DashboardHeader";
import EventManagementDialog from "@/components/EventManagementDialog";
import EventPerformancePanel from "@/components/EventPerformancePanel";
import InventorySummary from "@/components/InventorySummary";
import { EventsAndExpensesModal } from "@/components/EventsAndExpensesModal";
import styles from "./pos.module.scss";
import { usePosDashboard } from "./pos.logic";

export default function PosDashboard() {
  const model = usePosDashboard();

  return (
    <main className={`${styles.scope} min-h-screen px-4 pb-32 pt-6 text-[var(--foreground)]`}>
      <div className="mx-auto max-w-7xl">
        <header className={styles.header}>
          <DashboardHeader model={model} />
          <EventPerformancePanel model={model} />
        </header>

        <EventManagementDialog model={model} />

        <InventorySummary model={model} />

        <div className={styles.searchSection}>
          <input
            type="text"
            value={model.search}
            onChange={(event) => model.setSearch(event.target.value)}
            placeholder="Buscar producto, categoría o detalle..."
            className={styles.searchInput}
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <section className={styles.catalogSection}>
            <div className={styles.catalogHeader}>
              <h2 className={styles.catalogTitle}>Catálogo</h2>
              <span className={styles.catalogStatus}>
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

        <EventsAndExpensesModal isOpen={model.isEventsAndExpensesModalOpen} onClose={() => model.setIsEventsAndExpensesModalOpen(false)} />
      </div>
    </main>
  );
}
