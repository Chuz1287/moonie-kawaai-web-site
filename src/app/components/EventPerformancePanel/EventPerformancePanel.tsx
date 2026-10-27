"use client";

import { useState, useEffect } from "react";
import { Eye, EyeClosed } from "lucide-react";
import { formatPosCurrency, type PosDashboardModel } from "@/pages/pos/pos.logic";
import styles from "./EventPerformancePanel.module.scss";

const ROI_VISIBILITY_KEY = "moonie_kawaai_roi_visible";

export default function EventPerformancePanel({ model }: { model: PosDashboardModel }) {
  const [isVisible, setIsVisibleState] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { eventPerformance } = model;

  // Cargar estado de localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem(ROI_VISIBILITY_KEY);
    if (stored !== null) {
      setIsVisibleState(stored === "true");
    }
    setMounted(true);
  }, []);

  // Guardar estado en localStorage cuando cambia
  const setIsVisible = (value: boolean | ((prev: boolean) => boolean)) => {
    setIsVisibleState((prev) => {
      const newValue = typeof value === "function" ? value(prev) : value;
      localStorage.setItem(ROI_VISIBILITY_KEY, String(newValue));
      return newValue;
    });
  };

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

  return (
    <section aria-live="polite" className={styles.scope}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <p className={styles.headerLabel}>Retorno de inversión</p>
          <h2 className={styles.headerTitle}>
            {model.salesChannels.find((event) => event.id === model.selectedEvent)?.name ??
              "Default"}
          </h2>
        </div>
        {eventPerformance && !isVisible && (
          <strong
            className={
              eventPerformance.balance >= 0
                ? styles.balancePositive
                : styles.balanceNegative
            }
          >
            {eventPerformance.balance >= 0
              ? `Ganancia ${formatPosCurrency(eventPerformance.balance)}`
              : `Faltan ${formatPosCurrency(eventPerformance.amountToBreakEven)}`}
          </strong>
        )}
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className={styles.toggleButton}
          aria-label={isVisible ? "Ocultar detalles" : "Mostrar detalles"}
          title={isVisible ? "Ocultar" : "Mostrar"}
        >
          {isVisible ? <Eye size={20} /> : <EyeClosed size={20} />}
        </button>
      </div>

      {isVisible && (
        <>
          {eventPerformance && (
            <strong
              className={
                eventPerformance.balance >= 0
                  ? styles.balancePositive
                  : styles.balanceNegative
              }
            >
              {eventPerformance.balance >= 0
                ? `Ganancia ${formatPosCurrency(eventPerformance.balance)}`
                : `Faltan ${formatPosCurrency(eventPerformance.amountToBreakEven)}`}
            </strong>
          )}

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
                <p role="status" style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--accent-warning)" }}>
                  Hay {eventPerformance.incompleteSaleCount} venta(s) sin desglose completo de
                  productos; el costo de mercancía puede estar incompleto.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
