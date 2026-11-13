import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import type { InventoryCardProps } from "./InventoryCard.logic";
import styles from "./InventoryCard.module.scss";

export default function InventoryCard({ item, onAddStock, onDelete, onEdit }: InventoryCardProps) {
  return (
    <div className={styles.card}>
      {item.coverImage ? (
        <Image
          src={item.coverImage}
          alt={`Cover de ${item.name}`}
          className={styles.productImage}
          width={300}
          height={300}
          loading="lazy"
          unoptimized
        />
      ) : null}
      <div className={styles.cardHeader}>
        <div className={styles.headerInfo}>
          <h3 className={styles.itemName}>{item.name}</h3>
          <p className={styles.itemCode}>Código: {item.code || item.slug}</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={onEdit} className={styles.editButton} aria-label="Editar artículo">
            <Pencil size={18} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className={styles.deleteButton}
            aria-label="Eliminar artículo"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className={styles.cardContent}>
        <div className={styles.row}>
          <div className={styles.field}>
            <span className={styles.label}>Serie</span>
            <p className={styles.value}>{item.series || "—"}</p>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Categoría</span>
            <p className={styles.value}>{(item.categories ?? [item.category]).join(", ") || "—"}</p>
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
            <p className={styles.costValue}>C: MXN ${(item.cost ?? item.price * 0.7).toFixed(2)}</p>
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
