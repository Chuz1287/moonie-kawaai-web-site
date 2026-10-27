"use client";

import type { InventorySummary } from "@/components/InventoryDashboard.logic";
import styles from "./InventorySummary.module.scss";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export default function InventorySummary({ summary }: { summary: InventorySummary }) {
  return (
    <div className={styles.scope}>
      <div className={styles.card}>
        <p className={styles.label}>Ganancia bruta</p>
        <p className={styles.valuePrimary}>
          {formatCurrency(summary.grossProfit)}
        </p>
        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span>Margen bruto:</span>
            <span>{summary.grossMarginPercent.toFixed(1)}%</span>
          </div>
          <div className={styles.detailItem}>
            <span>Markup sobre costo:</span>
            <span>{summary.markupPercent.toFixed(1)}%</span>
          </div>
          {summary.markupExcessPercent > 0 && (
            <div className={styles.detailItem}>
              <span>Exceso: </span>
              <span>
                {summary.markupExcessPercent.toFixed(1)}%  {formatCurrency(summary.markupExcessValue)}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className={styles.cardcontainer}>
        <div className={styles.card}>
          <p className={styles.label}>Costo total</p>
          <p className={styles.value}>
            {formatCurrency(summary.totalInventoryCost)}
          </p>
        </div>
        <div className={styles.card}>
        <p className={styles.label}>Venta total</p>
        <p className={styles.valueSuccess}>
          {formatCurrency(summary.totalSaleValue)}
        </p>
      
      </div>
      </div>       
    </div>
  );
}
