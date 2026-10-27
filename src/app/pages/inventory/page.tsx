"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import InventoryHeader from "@/components/InventoryHeader/InventoryHeader";
import InventorySummary from "@/components/InventorySummary";
import InventoryCard from "@/components/InventoryCard/InventoryCard";
import InventoryAccordionItem from "@/components/InventoryAccordionItem/InventoryAccordionItem";
import AddInventoryModal from "@/components/AddInventoryModal/AddInventoryModal";
import { useInventoryDashboard } from "@/components/InventoryDashboard.logic";
import styles from "./inventory.module.scss";

export default function InventoryPage() {
  const model = useInventoryDashboard();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);

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
            onClick={() => setShowAddModal(true)}
            className={styles.buttonPrimary}
          >
            <Plus size={20} />
            Agregar Artículo
          </button>
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
      <div className={styles.gridContainer}>
        {model.filteredItems.map((item) => (
          <InventoryCard
            key={item.id}
            item={item}
            onAddStock={model.handleAddStock}
            onDelete={model.handleRemoveItem}
          />
        ))}
      </div>

      {/* Mobile Accordion */}
      <div className={styles.accordionContainer}>
        {model.filteredItems.map((item) => (
          <InventoryAccordionItem
            key={item.id}
            item={item}
            isExpanded={expandedItems.has(item.id)}
            onToggle={() => toggleExpanded(item.id)}
            onAddStock={model.handleAddStock}
            onDelete={model.handleRemoveItem}
          />
        ))}
      </div>

      <AddInventoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={model.handleAddItem}
      />
    </div>
  );
}
