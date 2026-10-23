"use client";

import type { ProductGridProps } from "./ProductGrid.logic";
import { formatCurrency, useCatalogStockDrafts } from "./ProductGrid.logic";
import styles from "./ProductGrid.module.scss";

export default function ProductGrid({ products, onAdd, onAddStock }: ProductGridProps) {
  const { getDraftQuantity, updateDraftQuantity, resetDraftQuantity } = useCatalogStockDrafts();

  return (
    <div className={styles.scope}>
      {products.map((product) => {
        const cost = product.cost ?? product.price * 0.7;
        const quantityDraft = getDraftQuantity(product.id);

        return (
          <div key={product.id} className={styles.productCard}>
            <button
              type="button"
              onClick={() => onAdd(product)}
              className={styles.cardButton}
            >
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardCategory}>{product.category}</p>
                  <h3 className={styles.cardTitle}>{product.name}</h3>
                </div>
                <span className={styles.cardStock}>{product.stock}</span>
              </div>

              <p className={styles.cardDescription}>{product.shortDescription}</p>

              <div className={styles.cardPricing}>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>Venta</span>
                  <span className={styles.priceValue}>{formatCurrency(product.price)}</span>
                </div>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>Costo</span>
                  <span className={`${styles.priceValue} ${styles.costValue}`}>{formatCurrency(cost)}</span>
                </div>
              </div>
            </button>

            <div className={styles.cardActions}>
              <div className={styles.actionButtons}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddStock(product, 1);
                  }}
                  className={styles.addStockButton}
                >
                  +1
                </button>

                <div className={styles.quantityInput}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantityDraft}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      updateDraftQuantity(product.id, event.target.value);
                    }}
                    aria-label={`Cantidad para agregar stock de ${product.name}`}
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const parsed = Number(quantityDraft || "1");
                      if (Number.isFinite(parsed) && parsed > 0) {
                        onAddStock(product, parsed);
                        resetDraftQuantity(product.id);
                      }
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>

              <span className={styles.actionLabel}>Agregar stock</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
