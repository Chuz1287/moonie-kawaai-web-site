import Image from "next/image";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { InventoryAccordionItemProps } from "./InventoryAccordionItem.logic";
import styles from "./InventoryAccordionItem.module.scss";

export default function InventoryAccordionItem({
  item,
  isExpanded,
  onToggle,
  onAddStock,
  onDelete,
  onEdit,
}: InventoryAccordionItemProps) {
  return (
    <div className={styles.accordionItem}>
      <button className={styles.accordionHeader} onClick={onToggle}>
        <div className={styles.accordionTitle}>
          <h3>{item.name}</h3>
          <p className={styles.accordionCode}>Código: {item.code || item.slug}</p>
        </div>
        <ChevronDown
          size={20}
          className={`${styles.chevron} ${isExpanded ? styles.expanded : ""}`}
        />
      </button>

      {isExpanded && (
        <div className={styles.accordionContent}>
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
          <div className={styles.contentRow}>
            <span className={styles.label}>Serie</span>
            <p>{item.series || "—"}</p>
          </div>
          <div className={styles.contentRow}>
            <span className={styles.label}>Categoría</span>
            <p>{item.category || "—"}</p>
          </div>
          <div className={styles.contentRow}>
            <span className={styles.label}>Stock</span>
            <p>{item.stock} pz</p>
          </div>
          <div className={styles.contentRow}>
            <span className={styles.label}>Precio</span>
            <p>MXN ${item.price.toFixed(2)}</p>
          </div>

          <div className={styles.accordionFooter}>
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
            <button
              onClick={onEdit}
              className={styles.editButton}
              aria-label="Editar artículo"
              title="Editar artículo"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className={styles.deleteButtonSmall}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
