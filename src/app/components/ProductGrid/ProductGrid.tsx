"use client";

import Image from "next/image";
import type { ProductGridProps } from "./ProductGrid.logic";
import { formatCurrency } from "./ProductGrid.logic";
import styles from "./ProductGrid.module.scss";

export default function ProductGrid({ products, onAdd }: ProductGridProps) {
  return (
    <div className={styles.scope}>
      {products.map((product) => {
        const cost = product.cost ?? product.price * 0.7;

        return (
          <div key={product.id} className={styles.productCard}>
            <button
              type="button"
              onClick={() => onAdd(product)}
              className={styles.cardButton}
            >
              {product.coverImage ? (
                <Image
                  src={product.coverImage}
                  alt={`Cover de ${product.name}`}
                  className={styles.productImage}
                  width={300}
                  height={300}
                  loading="lazy"
                  unoptimized
                />
              ) : null}
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
          </div>
        );
      })}
    </div>
  );
}
