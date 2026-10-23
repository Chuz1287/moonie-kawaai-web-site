"use client";

import type { Dispatch, SetStateAction } from "react";
import styles from "./QuantitySelector.module.scss";

export type QuantitySelectorProps = {
  quantity: number;
  maxStock: number;
  onQuantityChange: Dispatch<SetStateAction<number>>;
};

export default function QuantitySelector({
  quantity,
  maxStock,
  onQuantityChange,
}: QuantitySelectorProps) {
  const handleDecrease = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < maxStock) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <div className={styles.scope}>
      <label className={styles.label}>Cantidad</label>
      <div className={styles.controls}>
        <button
          type="button"
          onClick={handleDecrease}
          disabled={quantity <= 1}
          className={styles.button}
          aria-label="Disminuir cantidad"
        >
          −
        </button>
        <input
          type="number"
          value={quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (val >= 1 && val <= maxStock) {
              onQuantityChange(val);
            }
          }}
          className={styles.input}
          min="1"
          max={maxStock}
        />
        <button
          type="button"
          onClick={handleIncrease}
          disabled={quantity >= maxStock}
          className={styles.button}
          aria-label="Aumentar cantidad"
        >
          +
        </button>
      </div>
      <p className={styles.stock}>Stock disponible: {maxStock}</p>
    </div>
  );
}

