\"use client\";

import type { AddToCartButtonProps } from \"./AddToCartButton.logic\";import styles from "./AddToCartButton.module.scss";
export default function AddToCartButton({
  quantity = 1,
  onClick,
  disabled = false,
}: AddToCartButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={styles.button}
    >
      Agregar al carrito ({quantity})
    </button>
  );
}
