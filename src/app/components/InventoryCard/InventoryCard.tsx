import { Trash2 } from "lucide-react";
import type { InventoryCardProps } from "./InventoryCard.logic";
import styles from "./InventoryCard.module.scss";

export default function InventoryCard({ item, onAddStock, onDelete }: InventoryCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerInfo}>
          <h3 className={styles.itemName}>{item.name}</h3>
          <p className={styles.itemCode}>Slug: {item.slug}</p>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className={styles.deleteButton}
          aria-label="Eliminar artículo"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className={styles.cardContent}>
        <div className={styles.row}>
          <div className={styles.field}>
            <span className={styles.label}>Serie</span>
            <p className={styles.value}>{item.series || "—"}</p>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Categoría</span>
            <p className={styles.value}>{item.category || "—"}</p>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <span className={styles.label}>Stock</span>
            <p className={styles.value}>{item.stock} pz</p>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Precio</span>
            <p className={styles.value}>MXN ${item.price.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.stockControl}>
          <button
            onClick={() => onAddStock(item.id, -1)}
            className={styles.stockButton}
          >
            −
          </button>
          <span className={styles.stockValue}>{item.stock}</span>
          <button
            onClick={() => onAddStock(item.id, 1)}
            className={styles.stockButton}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
