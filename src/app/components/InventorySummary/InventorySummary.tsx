"use client";

import { formatPosCurrency, type PosDashboardModel } from "@/pages/pos/pos.logic";
import styles from "./InventorySummary.module.scss";

export default function InventorySummary({ model }: { model: PosDashboardModel }) {
  const { inventorySummary } = model;

  return (
    <div className={styles.scope}>
      <div className={styles.card}>
        <p className={styles.label}>Costo total</p>
        <p className={styles.value}>
          {formatPosCurrency(inventorySummary.totalInventoryCost)}
        </p>
      </div>

      <div className={styles.card}>
        <p className={styles.label}>Venta total</p>
        <p className={styles.valueSuccess}>
          {formatPosCurrency(inventorySummary.totalSaleValue)}
        </p>
      </div>

      <div className={styles.card}>
        <p className={styles.label}>Ganancia bruta</p>
        <p className={styles.valuePrimary}>
          {formatPosCurrency(inventorySummary.grossProfit)}
        </p>
        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span>Margen bruto:</span>
            <span>{inventorySummary.grossMarginPercent.toFixed(1)}%</span>
          </div>
          <div className={styles.detailItem}>
            <span>Markup sobre costo:</span>
            <span>{inventorySummary.markupPercent.toFixed(1)}%</span>
          </div>
          {inventorySummary.markupExcessPercent > 0 && (
            <div className={styles.detailItem}>
              <span>Exceso sobre 100%:</span>
              <span>
                {inventorySummary.markupExcessPercent.toFixed(1)}% / {formatPosCurrency(inventorySummary.markupExcessValue)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
