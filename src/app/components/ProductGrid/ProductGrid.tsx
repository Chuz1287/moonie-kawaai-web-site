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
              <div className={styles.media}>
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
                <span className={styles.cardStock}>{product.stock}</span>
              </div>

              <div className={styles.cardInfo}>
                <p className={styles.cardCategory}>
                  {(product.categories ?? [product.category]).join(" · ")}
                </p>
                <h3 className={styles.cardTitle}>{product.name}</h3>
                <p className={styles.cardDescription}>{product.shortDescription}</p>
              </div>

              <div className={styles.cardPricing}>
                <span className={styles.priceValue}>{formatCurrency(product.price)}</span>
                <span className={styles.costValue}>C: {formatCurrency(cost)}</span>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
