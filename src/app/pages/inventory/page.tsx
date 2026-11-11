"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, RefreshCw } from "lucide-react";
import InventoryHeader from "@/components/InventoryHeader/InventoryHeader";
import InventorySummary from "@/components/InventorySummary";
import InventoryCard from "@/components/InventoryCard/InventoryCard";
import InventoryAccordionItem from "@/components/InventoryAccordionItem/InventoryAccordionItem";
import AddInventoryModal from "@/components/AddInventoryModal/AddInventoryModal";
import { useInventoryDashboard } from "@/components/InventoryDashboard.logic";
import BulkImageUploader from "@/components/BulkImageUploader/BulkImageUploader";
import BulkProductImporter from "@/components/BulkProductImporter/BulkProductImporter";
import ProductOptionsManager from "@/components/ProductOptionsManager/ProductOptionsManager";
import styles from "./inventory.module.scss";

export default function InventoryPage() {
  const model = useInventoryDashboard();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [managedOptions, setManagedOptions] = useState({ categories: [] as string[], series: [] as string[] });
  const editingItem = model.items.find((item) => item.id === editingItemId);
  const categoryOptions = useMemo(
    () => [...new Set([
      ...model.items.map((item) => item.category),
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

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (model.loading) {
    return <div className={styles.scope}><p>Cargando inventario...</p></div>;
  }

  return (
    <div className={styles.scope}>
      <InventoryHeader />

      {model.error && (
        <div className={styles.error}>{model.error}</div>
      )}

      <InventorySummary summary={model.inventorySummary} />

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Buscar por nombre, serie, categoría..."
          value={model.searchQuery}
          onChange={(e) => model.setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />

        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={() => model.setShowOutOfStock(!model.showOutOfStock)}
            className={styles.button}
            aria-pressed={model.showOutOfStock}
          >
            {model.showOutOfStock
              ? "Ocultar sin stock"
              : `Ver sin stock (${model.outOfStockCount})`}
          </button>
          <Link href="/catalog?export=web" className={styles.buttonPrimary}>
            <BookOpen size={20} aria-hidden="true" />
            Descargar PDF web
          </Link>
          <Link href="/catalog" className={styles.button}>
            <BookOpen size={20} aria-hidden="true" />
            Ver catálogo interactivo
          </Link>
          <button
            onClick={() => {
              setEditingItemId(null);
              setShowAddModal(true);
            }}
            className={styles.buttonPrimary}
          >
            <Plus size={20} />
            Agregar Artículo
          </button>
          <BulkProductImporter />
          <BulkImageUploader />
          <ProductOptionsManager onOptionsChanged={refreshProductOptions} />
          <button
            onClick={() => void model.refreshInventory()}
            className={styles.button}
          >
            <RefreshCw size={18} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Desktop Grid */}
      {model.filteredItems.length === 0 ? (
        <p className={styles.emptyState}>
          {model.searchQuery
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
                isExpanded={expandedItems.has(item.id)}
                onToggle={() => toggleExpanded(item.id)}
                onAddStock={model.handleAddStock}
                onDelete={model.handleRemoveItem}
                onEdit={() => openEditModal(item.id)}
              />
            ))}
          </div>
        </>
      )}

      {showAddModal && (
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
            await refreshProductOptions();
          }}
        />
      )}
    </div>
  );
}
