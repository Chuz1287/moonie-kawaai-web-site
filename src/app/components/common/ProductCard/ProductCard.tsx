"use client";

import type { ProductCardProps } from "./ProductCard.logic";
import styles from "./ProductCard.module.scss";

export default function ProductCard({}: ProductCardProps) {
  return <div className={`${styles.scope}`}></div>;
}

