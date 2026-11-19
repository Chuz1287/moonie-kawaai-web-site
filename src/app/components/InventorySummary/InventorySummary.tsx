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
        <div className={styles.profit}>
          <p className={styles.label}>Ganancia bruta</p>
          <p className={styles.valuePrimary}>
            {formatCurrency(summary.grossProfit)}
          </p>
        </div>
        <dl className={styles.metrics}>
          <div className={styles.metric}>
            <dt>Margen</dt>
            <dd>{summary.grossMarginPercent.toFixed(1)}%</dd>
          </div>
          <div className={styles.metric}>
            <dt>Markup</dt>
            <dd>{summary.markupPercent.toFixed(1)}%</dd>
          </div>
          <div className={styles.metric}>
            <dt>Costo</dt>
            <dd>{formatCurrency(summary.totalInventoryCost)}</dd>
          </div>
          <div className={`${styles.metric} ${styles.metricSuccess}`}>
            <dt>Venta</dt>
            <dd>{formatCurrency(summary.totalSaleValue)}</dd>
          </div>
          {summary.markupExcessPercent > 0 && (
            <div className={styles.metric}>
              <dt>Exceso</dt>
              <dd>
                {/* {summary.markupExcessPercent.toFixed(1)}% */}
                 {formatCurrency(summary.markupExcessValue)}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
