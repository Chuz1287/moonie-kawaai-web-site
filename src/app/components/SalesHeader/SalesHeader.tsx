"use client";

import Link from "next/link";
import type { SalesHeaderProps } from "./SalesHeader.logic";
import styles from "./SalesHeader.module.scss";

export default function SalesHeader({ loading, onRefresh }: SalesHeaderProps) {
  return (
    <header className={styles.scope}>
      <div className={styles.titleSection}>
        <p className={styles.subtitle}>
          Historial
        </p>
        <h1 className={styles.title}>Ventas</h1>
      </div>
      {/* <div className={styles.actions}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={styles.button}
        >
          Actualizar
        </button>
        <Link
          href="/"
          className={styles.buttonPrimary}
        >
          Volver al POS
        </Link>
      </div> */}
    </header>
  );
}
