"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatPosCurrency, type PosDashboardModel } from "@/pages/pos/pos.logic";
import styles from "./EventPerformancePanel.module.scss";

export default function EventPerformancePanel({ model }: { model: PosDashboardModel }) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const { eventPerformance } = model;

  const progressPercent = eventPerformance
    ? eventPerformance.totalInvestment > 0
      ? Math.min(
          100,
          (eventPerformance.salesTotal / eventPerformance.totalInvestment) * 100
        )
      : eventPerformance.salesTotal > 0
        ? 100
        : 0
    : 0;

  const isPositive = (eventPerformance?.balance ?? 0) >= 0;

  let amountLabel = "…";
  if (eventPerformance) {
    amountLabel = isPositive
      ? `+${formatPosCurrency(eventPerformance.balance)}`
      : `-${formatPosCurrency(eventPerformance.amountToBreakEven)}`;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsBreakdownOpen((open) => !open)}
        className={`${styles.balanceButton} ${isPositive ? styles.positive : styles.negative}`}
        aria-expanded={isBreakdownOpen}
        aria-controls="event-roi-breakdown"
      >
        <span>{amountLabel}</span>
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
            <p className={styles.loading}>Calculando retorno del evento...</p>
          ) : (
            <>
              <div className={styles.metricsContainer}>
                <div className={styles.metricBox}>
                  <p className={styles.metricLabel}>Ventas del evento</p>
                  <p className={styles.metricValueSuccess}>
                    {formatPosCurrency(eventPerformance.salesTotal)}
                  </p>
                </div>
                <div className={styles.metricBox}>
                  <p className={styles.metricLabel}>Costo de mercancía vendida</p>
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
                  <p className={styles.metricLabel}>Inversión a recuperar</p>
                  <p className={styles.metricValue}>
                    {formatPosCurrency(eventPerformance.totalInvestment)}
                  </p>
                </div>
              </div>

              <div className={styles.progressSection}>
                <div
                  className={styles.progressBar}
                  role="progressbar"
                  aria-label="Porcentaje de inversión recuperada"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPercent)}
                >
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className={styles.progressLabel}>
                  {eventPerformance.balance >= 0
                    ? "La inversión del evento ya se recuperó."
                    : `Faltan ${formatPosCurrency(
                        eventPerformance.amountToBreakEven
                      )} para recuperar la inversión.`}
                </p>
              </div>

              {eventPerformance.incompleteSaleCount > 0 && (
                <p role="status" className={styles.warning}>
                  Hay {eventPerformance.incompleteSaleCount} venta(s) sin desglose completo de
                  productos; el costo de mercancía puede estar incompleto.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
