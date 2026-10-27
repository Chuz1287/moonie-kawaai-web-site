"use client";

import { DollarSign, Receipt, TrendingUp } from "lucide-react";
import type { SalesSummaryCardsProps } from "./SalesSummaryCards.logic";
import styles from "./SalesSummaryCards.module.scss";

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SalesSummaryCards({
  totalRevenue,
  totalProfit,
  count,
  viewMode,
}: SalesSummaryCardsProps) {
  const margin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
  const averageTicket = count > 0 ? totalRevenue / count : 0;
  const isTickets = viewMode === "tickets";

  return (
    <section className={styles.scope} aria-label="Resumen de ventas">
      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Total vendido</span>
          <span className={`${styles.iconBox} ${styles.success}`}>
            <DollarSign size={16} aria-hidden="true" />
          </span>
        </div>
        <strong className={styles.value}>{formatMoney(totalRevenue)}</strong>
        <span className={styles.hint}>Ingreso del periodo filtrado</span>
      </article>

      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Ganancia bruta</span>
          <span className={`${styles.iconBox} ${styles.accent}`}>
            <TrendingUp size={16} aria-hidden="true" />
          </span>
        </div>
        <strong className={styles.value}>{formatMoney(totalProfit)}</strong>
        <span className={styles.hint}>Margen {margin}%</span>
      </article>

      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <span>{isTickets ? "Tickets" : "Piezas (líneas)"}</span>
          <span className={`${styles.iconBox} ${styles.neutral}`}>
            <Receipt size={16} aria-hidden="true" />
          </span>
        </div>
        <strong className={styles.value}>{count}</strong>
        <span className={styles.hint}>
          {isTickets ? `Ticket promedio ${formatMoney(averageTicket)}` : "Líneas de producto"}
        </span>
      </article>
    </section>
  );
}
