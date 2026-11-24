"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import type {
  EventDailySales,
  EventFigurePriceRanking,
  EventPerformance,
  EventSalesRanking,
} from "@/types/events";
import Portal from "@/components/Portal";
import styles from "./EventPerformanceDashboard.module.scss";

type EventPerformanceDashboardProps = {
  eventId: string;
  refreshKey: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function formatDay(date: string) {
  return date === "Sin fecha"
    ? date
    : new Date(`${date}T12:00:00`).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

type DashboardDetail = "series" | "characters" | "ticket-average" | "figures" | "daily-sales";

function RankingChart({
  title,
  items,
  showAll = false,
  onViewMore,
}: {
  title: string;
  items: EventSalesRanking[];
  showAll?: boolean;
  onViewMore?: () => void;
}) {
  const visibleItems = showAll ? items : items.slice(0, 5);
  const maxUnits = Math.max(0, ...visibleItems.map((item) => item.unitsSold));

  return (
    <section className={styles.chartCard}>
      <h3 className={styles.chartTitle}>{title}</h3>
      {visibleItems.length > 0 ? (
        <ol className={styles.chartList}>
          {visibleItems.map((item) => (
            <li key={item.name} className={styles.chartItem}>
              <div className={styles.chartItemHeader}>
                <span className={styles.chartName}>{item.name}</span>
                <span className={styles.chartValue}>{item.unitsSold} pz</span>
              </div>
              <span
                className={styles.chartTrack}
                role="img"
                aria-label={`${item.unitsSold} unidades vendidas`}
              >
                <span
                  className={styles.chartBar}
                  style={{ width: `${maxUnits > 0 ? (item.unitsSold / maxUnits) * 100 : 0}%` }}
                />
              </span>
              <span className={styles.chartRevenue}>{formatCurrency(item.salesTotal)} en ventas</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.emptyState}>Sin datos de ventas todavía.</p>
      )}
      {!showAll && items.length > 5 && onViewMore && (
        <button type="button" className={styles.viewMoreButton} onClick={onViewMore}>
          Ver más ({items.length})
        </button>
      )}
    </section>
  );
}

function TicketAverageChart({
  items,
  showAll = false,
  onViewMore,
}: {
  items: Array<EventDailySales & { averageTicket: number }>;
  showAll?: boolean;
  onViewMore?: () => void;
}) {
  const visibleItems = showAll ? items : items.slice(0, 5);
  const maxValue = Math.max(0, ...visibleItems.map((item) => item.averageTicket));

  return (
    <section className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Top de ticket promedio por día</h3>
        <span className={styles.chartCaption}>Promedio por venta</span>
      </div>
      {visibleItems.length > 0 ? (
        <ol className={styles.chartList}>
          {visibleItems.map((day) => (
            <li key={day.date} className={styles.chartItem}>
              <div className={styles.chartItemHeader}>
                <span className={styles.chartName}>{formatDay(day.date)}</span>
                <span className={styles.chartValue}>{formatCurrency(day.averageTicket)}</span>
              </div>
              <span className={styles.chartTrack} aria-hidden="true">
                <span
                  className={styles.chartBar}
                  style={{ width: `${maxValue > 0 ? (day.averageTicket / maxValue) * 100 : 0}%` }}
                />
              </span>
              <span className={styles.chartRevenue}>{day.salesCount} tickets</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.emptyState}>Aún no hay ventas registradas.</p>
      )}
      {!showAll && items.length > 5 && onViewMore && (
        <button type="button" className={styles.viewMoreButton} onClick={onViewMore}>
          Ver más ({items.length})
        </button>
      )}
    </section>
  );
}

function FigurePriceChart({
  items,
  showAll = false,
  onViewMore,
}: {
  items: EventFigurePriceRanking[];
  showAll?: boolean;
  onViewMore?: () => void;
}) {
  const visibleItems = showAll ? items : items.slice(0, 5);
  const maxPrice = Math.max(0, ...visibleItems.map((item) => item.highestUnitPrice));

  return (
    <section className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Figuras con precio más alto</h3>
        <span className={styles.chartCaption}>Precio máximo por pieza</span>
      </div>
      {visibleItems.length > 0 ? (
        <ol className={styles.chartList}>
          {visibleItems.map((figure) => (
            <li key={figure.id} className={styles.chartItem}>
              <div className={styles.chartItemHeader}>
                <span className={styles.chartName}>{figure.name}</span>
                <span className={styles.chartValue}>{formatCurrency(figure.highestUnitPrice)}</span>
              </div>
              <span className={styles.chartTrack} aria-hidden="true">
                <span
                  className={styles.chartBar}
                  style={{
                    width: `${maxPrice > 0 ? (figure.highestUnitPrice / maxPrice) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className={styles.chartRevenue}>
                {figure.unitsSold} pz · {formatCurrency(figure.salesTotal)} en ventas
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.emptyState}>Sin datos de precios disponibles.</p>
      )}
      {!showAll && items.length > 5 && onViewMore && (
        <button type="button" className={styles.viewMoreButton} onClick={onViewMore}>
          Ver más ({items.length})
        </button>
      )}
    </section>
  );
}

function DailySalesChart({
  items,
  showAll = false,
  onViewMore,
}: {
  items: EventDailySales[];
  showAll?: boolean;
  onViewMore?: () => void;
}) {
  const visibleItems = showAll ? items : items.slice(-14);
  const maxSales = Math.max(0, ...visibleItems.map((day) => day.salesTotal));

  return (
    <section className={`${styles.chartCard} ${styles.salesTrendCard}`}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Ventas por día</h3>
        <span className={styles.chartCaption}>
          {showAll ? "Todos los días con actividad" : "Últimos 14 días con actividad"}
        </span>
      </div>
      {visibleItems.length > 0 ? (
        <ol className={styles.chartList}>
          {visibleItems.map((day) => (
            <li key={day.date} className={styles.chartItem}>
              <div className={styles.chartItemHeader}>
                <span className={styles.chartName}>{formatDay(day.date)}</span>
                <span className={styles.chartValue}>{formatCurrency(day.salesTotal)}</span>
              </div>
              <span className={styles.chartTrack} aria-hidden="true">
                <span
                  className={styles.chartBar}
                  style={{ width: `${maxSales > 0 ? (day.salesTotal / maxSales) * 100 : 0}%` }}
                />
              </span>
              <span className={styles.chartRevenue}>{day.salesCount} tickets</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.emptyState}>Aún no hay ventas registradas.</p>
      )}
      {!showAll && items.length > 14 && onViewMore && (
        <button type="button" className={styles.viewMoreButton} onClick={onViewMore}>
          Ver más ({items.length})
        </button>
      )}
    </section>
  );
}

export default function EventPerformanceDashboard({
  eventId,
  refreshKey,
}: EventPerformanceDashboardProps) {
  const [manualRefreshKey, setManualRefreshKey] = useState(0);
  const [result, setResult] = useState<{
    requestKey: string;
    performance?: EventPerformance;
    error?: string;
  } | null>(null);
  const [activeDetail, setActiveDetail] = useState<DashboardDetail | null>(null);
  const requestKey = `${eventId}:${refreshKey}:${manualRefreshKey}`;

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const controller = new AbortController();

    async function loadPerformance() {
      try {
        const response = await fetch(
          `/api/events/${encodeURIComponent(eventId)}/performance`,
          { cache: "no-store", signal: controller.signal }
        );
        const payload = (await response.json()) as EventPerformance & { message?: string };
        if (!response.ok) {
          throw new Error(payload.message ?? "No se pudieron cargar las estadísticas del evento.");
        }
        setResult({ requestKey, performance: payload });
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setResult({
            requestKey,
            error: loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar las estadísticas del evento.",
          });
        }
      }
    }

    void loadPerformance();
    return () => controller.abort();
  }, [eventId, manualRefreshKey, refreshKey, requestKey]);

  useEffect(() => {
    if (!activeDetail) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveDetail(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeDetail]);

  const hasCurrentResult = result?.requestKey === requestKey;
  const performance = hasCurrentResult ? result.performance ?? null : null;
  const error = hasCurrentResult ? result.error ?? "" : "";
  const loading = Boolean(eventId) && !hasCurrentResult;

  const dailyTicketAverages = useMemo(
    () => (performance?.dailySales ?? [])
      .map((day) => ({
        ...day,
        averageTicket: day.salesCount > 0 ? day.salesTotal / day.salesCount : 0,
      }))
      .sort((first, second) =>
        second.averageTicket - first.averageTicket ||
        second.salesCount - first.salesCount ||
        first.date.localeCompare(second.date, "es-MX")
      ),
    [performance]
  );
  const detailTitle = activeDetail === "series"
    ? "Series más vendidas"
    : activeDetail === "characters"
      ? "Personajes más vendidos"
      : activeDetail === "ticket-average"
        ? "Ticket promedio por día"
        : activeDetail === "figures"
          ? "Figuras con precio más alto"
          : "Ventas por día";

  if (!eventId) {
    return (
      <section className={styles.dashboard} aria-labelledby="event-performance-title">
        <h2 id="event-performance-title" className={styles.title}>Desempeño del evento</h2>
        <p className={styles.emptyState}>Selecciona un evento para consultar sus estadísticas.</p>
      </section>
    );
  }

  return (
    <section
      className={styles.dashboard}
      aria-labelledby="event-performance-title"
      aria-busy={loading}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Resultados y rentabilidad</p>
          <h2 id="event-performance-title" className={styles.title}>Desempeño del evento</h2>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => setManualRefreshKey((current) => current + 1)}
          disabled={loading}
          aria-label="Actualizar estadísticas"
          title="Actualizar estadísticas"
        >
          <RefreshCw size={17} aria-hidden="true" />
          Actualizar
        </button>
      </header>

      {error ? (
        <p className={styles.error} role="alert">{error}</p>
      ) : loading && !performance ? (
        <p className={styles.loading} role="status">Cargando estadísticas del evento...</p>
      ) : performance ? (
        <>
          <div className={styles.metricGrid}>
            <article className={`${styles.metricCard} ${styles.primaryMetric}`}>
              <span className={styles.metricLabel}>Ganancia neta</span>
              <strong className={performance.netProfit >= 0 ? styles.positiveValue : styles.negativeValue}>
                {formatCurrency(performance.netProfit)}
              </strong>
              <span className={styles.metricFootnote}>Después de costos y gastos</span>
            </article>
            <article className={`${styles.metricCard} ${styles.primaryMetric}`}>
              <span className={styles.metricLabel}>ROI del evento</span>
              <strong className={performance.roiPercent !== null && performance.roiPercent >= 0
                ? styles.positiveValue
                : styles.negativeValue}>
                {formatPercent(performance.roiPercent)}
              </strong>
              <span className={styles.metricFootnote}>Retorno sobre la inversión</span>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Ventas</span>
              <strong className={styles.metricValue}>{formatCurrency(performance.salesTotal)}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Margen neto</span>
              <strong className={styles.metricValue}>{formatPercent(performance.netMarginPercent)}</strong>
            </article>
          </div>

          <div className={styles.summaryStrip} aria-label="Indicadores operativos">
            <div><span>Tickets</span><strong>{performance.salesCount}</strong></div>
            <div><span>Unidades</span><strong>{performance.unitsSold}</strong></div>
            <div><span>Ticket promedio</span><strong>{formatCurrency(performance.averageTicket)}</strong></div>
            <div><span>Costo de mercancía</span><strong>{formatCurrency(performance.merchandiseCost)}</strong></div>
            <div><span>Gastos del evento</span><strong>{formatCurrency(performance.expensesTotal)}</strong></div>
          </div>

          {performance.incompleteSaleCount > 0 && (
            <p className={styles.warning} role="status">
              El costo histórico no está completo en {performance.incompleteSaleCount} venta(s).
              La ganancia neta es parcial y el ROI no se muestra como cifra exacta.
            </p>
          )}

          <div className={styles.chartGrid}>
            <RankingChart
              title="Series más vendidas"
              items={performance.topSeries}
              onViewMore={() => setActiveDetail("series")}
            />
            <RankingChart
              title="Personajes más vendidos"
              items={performance.topCharacters}
              onViewMore={() => setActiveDetail("characters")}
            />
            <TicketAverageChart
              items={dailyTicketAverages}
              onViewMore={() => setActiveDetail("ticket-average")}
            />
            <FigurePriceChart
              items={performance.topFiguresByPrice}
              onViewMore={() => setActiveDetail("figures")}
            />
            <DailySalesChart
              items={performance.dailySales}
              onViewMore={() => setActiveDetail("daily-sales")}
            />
          </div>

          <p className={styles.formula}>
            ROI = (ganancia neta ÷ (costo de mercancía vendida + gastos del evento)) × 100.
            Margen neto = ganancia neta ÷ ventas × 100.
          </p>
        </>
      ) : null}
      {activeDetail && performance && (
        <Portal>
          <div className={styles.modalOverlay} onClick={() => setActiveDetail(null)}>
            <section
              className={styles.detailModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="event-detail-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header className={styles.modalHeader}>
                <h2 id="event-detail-title">{detailTitle}</h2>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={() => setActiveDetail(null)}
                  aria-label="Cerrar detalle"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </header>
              {activeDetail === "series" && (
                <RankingChart title={detailTitle} items={performance.topSeries} showAll />
              )}
              {activeDetail === "characters" && (
                <RankingChart title={detailTitle} items={performance.topCharacters} showAll />
              )}
              {activeDetail === "ticket-average" && (
                <TicketAverageChart items={dailyTicketAverages} showAll />
              )}
              {activeDetail === "figures" && (
                <FigurePriceChart items={performance.topFiguresByPrice} showAll />
              )}
              {activeDetail === "daily-sales" && (
                <DailySalesChart items={performance.dailySales} showAll />
              )}
            </section>
          </div>
        </Portal>
      )}
    </section>
  );
}
