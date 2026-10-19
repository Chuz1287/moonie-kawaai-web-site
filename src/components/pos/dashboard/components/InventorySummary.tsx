"use client";

import { formatPosCurrency, type PosDashboardModel } from "../dashboard.logic";

export default function InventorySummary({ model }: { model: PosDashboardModel }) {
  const { inventorySummary } = model;

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Costo total
        </p>
        <p className="mt-3 text-2xl font-black text-white">
          {formatPosCurrency(inventorySummary.totalInventoryCost)}
        </p>
      </div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Venta total
        </p>
        <p className="mt-3 text-2xl font-black text-emerald-300">
          {formatPosCurrency(inventorySummary.totalSaleValue)}
        </p>
      </div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Ganancia bruta
        </p>
        <p className="mt-3 text-2xl font-black text-violet-300">
          {formatPosCurrency(inventorySummary.grossProfit)}
        </p>
        <div className="mt-3 space-y-1 text-xs text-slate-300">
          <p>
            Margen bruto:{" "}
            <span className="font-bold text-violet-200">
              {inventorySummary.grossMarginPercent.toFixed(1)}%
            </span>
          </p>
          <p>
            Markup sobre costo:{" "}
            <span className="font-bold text-emerald-300">
              {inventorySummary.markupPercent.toFixed(1)}%
            </span>
          </p>
          {inventorySummary.markupExcessPercent > 0 && (
            <p>
              Exceso sobre 100%:{" "}
              <span className="font-bold text-amber-300">
                {inventorySummary.markupExcessPercent.toFixed(1)}%
              </span>{" "}
              /{" "}
              <span className="font-bold text-amber-300">
                {formatPosCurrency(inventorySummary.markupExcessValue)}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
