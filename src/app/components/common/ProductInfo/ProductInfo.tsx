"use client";

import type { Product } from "@/types/store";
import styles from "./ProductInfo.module.scss";

export type ProductInfoProps = {
  product: Product;
};

export default function ProductInfo({ product }: ProductInfoProps) {
  return (
    <div className={styles.scope}>
      <div className={styles.categoryAndTitle}>
        <p className={styles.category}>{product.category}</p>
        <h1 className={styles.title}>{product.name}</h1>
      </div>

      <div className={styles.priceSection}>
        <span className={styles.price}>${product.price}</span>
        {product.compareAtPrice ? (
          <span className={styles.compareAtPrice}>
            ${product.compareAtPrice}
          </span>
        ) : null}
      </div>

      <p className={styles.description}>{product.description}</p>

      <div className={styles.badges}>
        <span className={styles.badge}>
          {product.stock} en stock
        </span>
        <span className={styles.badgeSuccess}>
          Envío seguro
        </span>
      </div>
    </div>
  );
}
