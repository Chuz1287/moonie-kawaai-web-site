"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatPosCurrency, type PosDashboardModel } from "@/pages/pos/pos.logic";
import { SkeletonLine } from "@/components/Skeleton";
import styles from "./EventPerformancePanel.module.scss";

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

export default function EventPerformancePanel({ model }: { model: PosDashboardModel }) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const { eventPerformance } = model;
  const isPositive = (eventPerformance?.netProfit ?? 0) >= 0;
  const roiLabel = eventPerformance
    ? `ROI ${eventPerformance.roiPercent !== null && eventPerformance.roiPercent > 0 ? "+" : ""}${formatPercent(eventPerformance.roiPercent)}`
    : "ROI …";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsBreakdownOpen((open) => !open)}
        className={`${styles.balanceButton} ${isPositive ? styles.positive : styles.negative}`}
        aria-expanded={isBreakdownOpen}
        aria-controls="event-roi-breakdown"
        aria-label={`Ver retorno de inversión del evento: ${roiLabel}`}
      >
        <span>{roiLabel}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={isBreakdownOpen ? styles.chevronOpen : undefined}
        />
      </button>

      {isBreakdownOpen && (
        <div id="event-roi-breakdown" aria-live="polite" className={styles.breakdown}>
          {model.eventPerformanceError ? (
            <p role="alert" className={styles.error}>
              {model.eventPerformanceError}
            </p>
          ) : !eventPerformance ? (
            <div className={styles.loading}>
              <SkeletonLine height="2.5rem" />
              <SkeletonLine height="2.5rem" />
            </div>
          ) : (
            <>
              {eventPerformance.incompleteSaleCount > 0 && (
                <p role="status" className={styles.warning}>
                  El ROI no está disponible porque {eventPerformance.incompleteSaleCount} venta(s)
                  no tienen costos completos.
                </p>
              )}
              {eventPerformance.roiPercent === null && eventPerformance.incompleteSaleCount === 0 && (
                <p className={styles.warning}>
                  El ROI estará disponible cuando el evento tenga costos registrados.
                </p>
              )}
              <div className={styles.metricsContainer}>
                <div className={styles.metricBox}>
                  <p className={styles.metricLabel}>ROI</p>
                  <p className={styles.metricValueSuccess}>
                    {formatPercent(eventPerformance.roiPercent)}
                  </p>
                </div>
                <div className={styles.metricBox}>
                  <p className={styles.metricLabel}>Ganancia neta</p>
                  <p className={eventPerformance.netProfit >= 0
                    ? styles.metricValueSuccess
                    : styles.metricValueWarning}>
                    {formatPosCurrency(eventPerformance.netProfit)}
                  </p>
                </div>
                <div className={styles.metricBox}>
                  <p className={styles.metricLabel}>Ventas</p>
                  <p className={styles.metricValue}>
                    {formatPosCurrency(eventPerformance.salesTotal)}
                  </p>
                </div>
                <div className={styles.metricBox}>
                  <p className={styles.metricLabel}>Costo de mercancía</p>
                  <p className={styles.metricValue}>
                    {formatPosCurrency(eventPerformance.merchandiseCost)}
                  </p>
                </div>
                <div className={styles.metricBox}>
                  <p className={styles.metricLabel}>Gastos del evento</p>
                  <p className={styles.metricValue}>
                    {formatPosCurrency(eventPerformance.expensesTotal)}
                  </p>
                </div>
                <div className={styles.metricBox}>
                  <p className={styles.metricLabel}>Margen neto sobre ventas</p>
                  <p className={styles.metricValue}>
                    {formatPercent(eventPerformance.netMarginPercent)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
