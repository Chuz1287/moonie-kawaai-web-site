"use client";

import { useState } from "react";
import { getSaleLineName, getSaleLines, type SalesHistoryModel } from "../sales.logic";
import { getSaleProfit, type SaleRecord } from "@/services/sales";
import SaleActions from "./SaleActions";
import styles from "./SalesTicketCard.module.scss";

type SalesListProps = {
  model: SalesHistoryModel;
};

function SaleActionsFor({
  sale,
  model,
}: {
  sale: SaleRecord;
  model: SalesHistoryModel;
}) {
  return (
    <SaleActions
      sale={sale}
      busy={model.busySaleIds.includes(sale.id)}
      onEdit={model.startEditing}
      onDelete={(item) => void model.handleDelete(item)}
    />
  );
}

function TicketCard({
  sale,
  model,
}: {
  sale: SaleRecord;
  model: SalesHistoryModel;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { getEventName } = model;
  const lines = getSaleLines(sale);
  const profit = getSaleProfit(sale);

  return (
    <article className={styles["sales-ticket"]}>
      <div className={styles["ticket-header"]}>
        <div className={styles["ticket-info"]}>
          <h3 className={styles["ticket-number"]}>Ticket {sale.sale_number ?? sale.id}</h3>
          <div className={styles["ticket-meta"]}>
            <span>{sale.fecha}</span>
            <span>{sale.hora}</span>
            <span>{getEventName(sale.event_id)}</span>
          </div>
          <span className={styles["ticket-status"]}>Completado</span>
        </div>

        <div className={styles["ticket-amount"]}>
          <div className={styles["amount-value"]}>${Number(sale.total ?? 0).toFixed(2)}</div>
          <div className={styles["amount-label"]}>Total</div>
          <div className={styles["profit"]}>
            <div className={styles["profit-value"]}>Ganancia ${profit.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className={styles["products-section"]}>
        <button
          type="button"
          className={styles["products-toggle"]}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>Productos ({lines.length})</span>
          <span className={`${styles["toggle-icon"]} ${isExpanded ? "" : styles["collapsed"]}`}>
            ▼
          </span>
        </button>

        <div className={`${styles["products-list"]} ${isExpanded ? "" : styles["collapsed"]}`}>
          {lines.map((line, index) => {
            const quantity = Number(line.quantity ?? line.cantidad ?? 0);
            const unitPrice = Number(line.unitPrice ?? line.precio_venta_unitario ?? 0);
            const total = quantity * unitPrice;

            return (
              <div key={`${sale.id}-${line.productId ?? line.product_id ?? index}`} className={styles["product-item"]}>
                <div className={styles["product-image"]}>
                  {/* Placeholder - agregar imagen real si es disponible */}
                  <div style={{ width: "100%", height: "100%", background: "rgb(30 41 59)" }} />
                </div>

                <div className={styles["product-info"]}>
                  <h4 className={styles["product-name"]}>{getSaleLineName(line)}</h4>
                  <p className={styles["product-id"]}>ID: {line.productId ?? line.product_id ?? "—"}</p>
                </div>

                <div className={styles["product-metrics"]}>
                  <div className={styles["metric"]}>
                    <span className={styles["metric-label"]}>Cantidad</span>
                    <span className={styles["metric-value"]}>{quantity}</span>
                  </div>
                  <div className={styles["metric"]}>
                    <span className={styles["metric-label"]}>Precio</span>
                    <span className={styles["metric-value"]}>${unitPrice.toFixed(2)}</span>
                  </div>
                  <div className={styles["metric"]}>
                    <span className={styles["metric-label"]}>Total</span>
                    <span className={styles["metric-value"]}>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles["warning"]}>
        <div className={styles["warning-icon"]}>⚠</div>
        <div className={styles["warning-text"]}>No editable: faltan IDs de producto para ajustar el inventario con seguridad.</div>
      </div>

      <div className={styles["actions"]}>
        <SaleActionsFor sale={sale} model={model} />
      </div>
    </article>
  );
}

export default function SalesList({ model }: SalesListProps) {
  const {
    loading,
    displayedCount,
    searchText,
    viewMode,
    matchingSales,
    paginatedGroups,
    pieces,
    visibleCount,
    setVisibleCount,
    getEventName,
  } = model;

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Cargando ventas…
      </div>
    );
  }

  if (displayedCount === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center text-slate-300">
        {searchText
          ? "No se encontraron piezas con esa búsqueda."
          : "No hay ventas registradas para estos filtros."}
      </div>
    );
  }

  if (viewMode === "tickets") {
    return (
      <div className="space-y-6">
        {paginatedGroups.map((group) => (
          <section
            key={group.date}
            className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-white">{group.date}</h2>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300">
                ${group.total.toFixed(2)}
              </span>
            </div>
            <div className="space-y-3">
              {group.items.map((sale) => (
                <TicketCard key={sale.id} sale={sale} model={model} />
              ))}
            </div>
          </section>
        ))}
        {matchingSales.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 100)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold text-violet-200 hover:border-violet-400"
          >
            Mostrar más tickets ({matchingSales.length - visibleCount} restantes)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-lg">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="sticky top-0 bg-slate-800 text-xs uppercase tracking-wide text-slate-300">
          <tr>
            <th className="px-4 py-3">Pieza vendida</th>
            <th className="px-4 py-3">Ticket</th>
            <th className="px-4 py-3">Fecha / evento</th>
            <th className="px-4 py-3">Cant.</th>
            <th className="px-4 py-3">Precio unit.</th>
            <th className="px-4 py-3">Importe</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pieces.slice(0, visibleCount).map(({ sale, line, index }) => {
            const quantity = Number(line.quantity ?? line.cantidad ?? 0);
            const unitPrice = Number(line.unitPrice ?? line.precio_venta_unitario ?? 0);
            return (
              <tr
                key={`${sale.id}-${line.productId ?? line.product_id ?? index}`}
                className="border-t border-slate-800 text-slate-200"
              >
                <td className="px-4 py-3 font-semibold">
                  {getSaleLineName(line)}{" "}
                  <span className="text-xs text-slate-500">
                    #{line.productId ?? line.product_id ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">{sale.sale_number ?? sale.id}</td>
                <td className="px-4 py-3">
                  {sale.fecha} · {getEventName(sale.event_id)}
                </td>
                <td className="px-4 py-3">{quantity}</td>
                <td className="px-4 py-3">${unitPrice.toFixed(2)}</td>
                <td className="px-4 py-3">${(quantity * unitPrice).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <SaleActionsFor sale={sale} model={model} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pieces.length > visibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + 100)}
          className="w-full border-t border-slate-800 px-4 py-3 font-bold text-violet-200 hover:bg-slate-800"
        >
          Mostrar más piezas ({pieces.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
}
