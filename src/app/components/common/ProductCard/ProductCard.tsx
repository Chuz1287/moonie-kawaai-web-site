"use client";

import type { ProductCardProps } from "./ProductCard.logic";
import styles from "./ProductCard.module.scss";

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className={styles.scope}>
      <img
        src={product.image}
        alt={product.name}
        className={styles.image}
      />
      <div className={styles.content}>
        <p className={styles.category}>{product.category}</p>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.description}>{product.shortDescription}</p>
        <div className={styles.footer}>
          <span className={styles.price}>${product.price.toFixed(2)}</span>
          <span className={styles.stock}>Stock: {product.stock}</span>
        </div>
      </div>
    </div>
  );
}

