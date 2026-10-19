"use client";

import { getSaleLineName, getSaleLines, type SalesHistoryModel } from "../sales.logic";
import { getSaleProfit, type SaleRecord } from "@/services/sales";
import SaleActions from "./SaleActions";

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
                <article
                  key={sale.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">
                        Ticket {sale.sale_number ?? sale.id}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {sale.fecha} · {sale.hora} · {getEventName(sale.event_id)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-300">
                        ${Number(sale.total ?? 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400">
                        Ganancia ${getSaleProfit(sale).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mb-4 overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="bg-slate-800 text-xs uppercase text-slate-300">
                        <tr>
                          <th className="px-3 py-2">Pieza</th>
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Cant.</th>
                          <th className="px-3 py-2">Precio</th>
                          <th className="px-3 py-2">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSaleLines(sale).map((line, index) => {
                          const quantity = Number(line.quantity ?? line.cantidad ?? 0);
                          const unitPrice = Number(
                            line.unitPrice ?? line.precio_venta_unitario ?? 0
                          );
                          return (
                            <tr
                              key={`${sale.id}-${line.productId ?? line.product_id ?? index}`}
                              className="border-t border-slate-800 text-slate-200"
                            >
                              <td className="px-3 py-2">{getSaleLineName(line)}</td>
                              <td className="px-3 py-2 text-slate-400">
                                {line.productId ?? line.product_id ?? "—"}
                              </td>
                              <td className="px-3 py-2">{quantity}</td>
                              <td className="px-3 py-2">${unitPrice.toFixed(2)}</td>
                              <td className="px-3 py-2">
                                ${(quantity * unitPrice).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <SaleActionsFor sale={sale} model={model} />
                </article>
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
