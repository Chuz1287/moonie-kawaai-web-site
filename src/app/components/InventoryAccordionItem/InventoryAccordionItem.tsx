import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import type { InventoryAccordionItemProps } from "./InventoryAccordionItem.logic";
import styles from "./InventoryAccordionItem.module.scss";

export default function InventoryAccordionItem({
  item,
  onAddStock,
  onDelete,
  onEdit,
}: InventoryAccordionItemProps) {
  const cost = item.cost ?? item.price * 0.7;

  return (
    <div className={styles.item}>
      <div className={styles.row}>
        <div className={styles.media}>
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
          <span className={styles.stockBadge}>{item.stock}</span>
        </div>

        <div className={styles.info}>
          <p className={styles.category}>{(item.categories ?? [item.category]).join(", ") || "—"}</p>
          <h3 className={styles.name}>{item.name}</h3>
          <p className={styles.meta}>
            {item.series || "—"} • Código: {item.code || item.slug}
          </p>
        </div>

        <div className={styles.pricing}>
          <span className={styles.price}>MXN ${item.price.toFixed(2)}</span>
          <span className={styles.cost}>C: MXN ${cost.toFixed(2)}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <div className={styles.stockControl}>
          <button
            onClick={() => onAddStock(item.id, -1)}
            className={styles.stockButton}
            aria-label="Quitar stock"
          >
            −
          </button>
          <span className={styles.stockValue}>{item.stock} pz</span>
          <button
            onClick={() => onAddStock(item.id, 1)}
            className={styles.stockButton}
            aria-label="Agregar stock"
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
          className={styles.deleteButton}
          aria-label="Eliminar artículo"
          title="Eliminar artículo"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
