"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, FileSpreadsheet, Plus } from "lucide-react";
import InventoryHeader from "@/components/InventoryHeader/InventoryHeader";
import InventorySummary from "@/components/InventorySummary";
import InventoryCard from "@/components/InventoryCard/InventoryCard";
import InventoryAccordionItem from "@/components/InventoryAccordionItem/InventoryAccordionItem";
import AddInventoryModal from "@/components/AddInventoryModal/AddInventoryModal";
import Portal from "@/components/Portal";
import { useInventoryDashboard } from "@/components/InventoryDashboard.logic";
import BulkProductImporter from "@/components/BulkProductImporter/BulkProductImporter";
import ProductOptionsManager from "@/components/ProductOptionsManager/ProductOptionsManager";
import styles from "./inventory.module.scss";
import { SkeletonCardGrid } from "@/components/Skeleton";

export default function InventoryPage() {
  const model = useInventoryDashboard();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [managedOptions, setManagedOptions] = useState({ categories: [] as string[], series: [] as string[] });
  const editingItem = model.items.find((item) => item.id === editingItemId);
  const categoryOptions = useMemo(
    () => [...new Set([
      ...model.items.flatMap((item) => item.categories ?? [item.category]),
      ...managedOptions.categories,
    ].filter(Boolean))].sort(),
    [managedOptions.categories, model.items]
  );
  const seriesOptions = useMemo(
    () => [...new Set([
      ...model.items.map((item) => item.series).filter((series): series is string => Boolean(series)),
      ...managedOptions.series,
    ])].sort(),
    [managedOptions.series, model.items]
  );

  const refreshProductOptions = async () => {
    const response = await fetch("/api/product-options", { cache: "no-store" });
    const result = (await response.json()) as {
      categories?: string[];
      series?: string[];
      message?: string;
    };
    if (!response.ok || !result.categories || !result.series) {
      throw new Error(result.message ?? "No se pudieron cargar las categorías y series.");
    }
    setManagedOptions({ categories: result.categories, series: result.series });
  };
  const openEditModal = (productId: string) => {
    setEditingItemId(productId);
    setShowAddModal(true);
  };

  if (model.loading) {
    return (
      <div className={styles.scope} aria-busy="true">
        <SkeletonCardGrid count={8} />
      </div>
    );
  }

  return (
    <div className={`${styles.scope} app-enter`}>
      <InventoryHeader totalCount={model.totalProductCount} />

      {model.error && (
        <div className={styles.error}>{model.error}</div>
      )}

      <InventorySummary summary={model.inventorySummary} />

      <div className={styles.controls}>
        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={() => model.setShowOutOfStock(!model.showOutOfStock)}
            className={styles.button}
            aria-pressed={model.showOutOfStock}
          >
            {model.showOutOfStock
              ? `Con stock (${model.inStockCount})`
              : `Sin stock (${model.outOfStockCount})`}
          </button>
          <details
            className={styles.catalogDropdown}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                event.currentTarget.open = false;
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && event.currentTarget.open) {
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) {
                event.currentTarget.open = false;
              }
            }}
          >
            <summary className={styles.iconButton} aria-label="Catálogo" title="Catálogo">
              <BookOpen size={20} aria-hidden="true" />
              <span className={styles.buttonLabel}>Catálogo</span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className={styles.catalogOptions}>
              <Link href="/catalog#precios" className={styles.button}>
                Preparar PDF web
              </Link>
              <Link href="/catalog" className={styles.button}>
                Ver catálogo interactivo
              </Link>
            </div>
          </details>
          <details
            className={styles.catalogDropdown}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                event.currentTarget.open = false;
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && event.currentTarget.open) {
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button")) {
                event.currentTarget.open = false;
              }
            }}
          >
            <summary className={styles.iconButtonPrimary} aria-label="Agregar" title="Agregar">
              <Plus size={20} aria-hidden="true" />
              <span className={styles.buttonLabel}>Agregar</span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className={styles.catalogOptions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  setEditingItemId(null);
                  setShowAddModal(true);
                }}
              >
                <Plus size={18} aria-hidden="true" />
                Agregar artículo
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => setShowImporter(true)}
              >
                <FileSpreadsheet size={18} aria-hidden="true" />
                Importar productos por Excel
              </button>
            </div>
          </details>
          <BulkProductImporter
            open={showImporter}
            onOpenChange={setShowImporter}
            showTrigger={false}
          />
          <ProductOptionsManager onOptionsChanged={refreshProductOptions} />
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre, serie, categoría..."
          value={model.searchQuery}
          onChange={(e) => model.setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Desktop Grid */}
      {model.filteredItems.length === 0 ? (
        <p className={styles.emptyState}>
          {model.showOutOfStock
            ? model.searchQuery
              ? "No hay productos sin stock que coincidan con la búsqueda."
              : "No hay productos sin stock para mostrar."
            : model.searchQuery
              ? "No hay productos con existencia que coincidan con la búsqueda."
              : "No hay productos con existencia para mostrar."}
        </p>
      ) : (
        <>
          <div className={styles.gridContainer}>
            {model.filteredItems.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                onAddStock={model.handleAddStock}
                onDelete={model.handleRemoveItem}
                onEdit={() => openEditModal(item.id)}
              />
            ))}
          </div>

          <div className={styles.accordionContainer}>
            {model.filteredItems.map((item) => (
              <InventoryAccordionItem
                key={item.id}
                item={item}
                onAddStock={model.handleAddStock}
                onDelete={model.handleRemoveItem}
                onEdit={() => openEditModal(item.id)}
              />
            ))}
          </div>
        </>
      )}

      {showAddModal && (
        <Portal>
          <AddInventoryModal
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setEditingItemId(null);
            }}
            editingItem={editingItem}
            categoryOptions={categoryOptions}
            seriesOptions={seriesOptions}
            onSubmit={async (item, productId) => {
              if (productId) {
                await model.handleEditItem(productId, item);
              } else {
                await model.handleAddItem(item);
              }
              await model.refreshInventory();
              await refreshProductOptions();
            }}
          />
        </Portal>
      )}
    </div>
  );
}
