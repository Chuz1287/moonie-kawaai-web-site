"use client";

import type { SalesViewMode } from "../sales.logic";

type SalesSummaryCardsProps = {
  totalRevenue: number;
  totalProfit: number;
  count: number;
  viewMode: SalesViewMode;
};

export default function SalesSummaryCards({
  totalRevenue,
  totalProfit,
  count,
  viewMode,
}: SalesSummaryCardsProps) {
  return (
    <section className="mb-6 grid gap-4 md:grid-cols-3" aria-label="Resumen de ventas">
      <article className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Total vendido
        </p>
        <p className="mt-3 text-2xl font-black text-emerald-300">
          ${totalRevenue.toFixed(2)}
        </p>
      </article>
      <article className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Ganancia bruta
        </p>
        <p className="mt-3 text-2xl font-black text-violet-300">
          ${totalProfit.toFixed(2)}
        </p>
      </article>
      <article className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          {viewMode === "tickets" ? "Tickets" : "Piezas (líneas)"}
        </p>
        <p className="mt-3 text-2xl font-black text-white">{count}</p>
      </article>
    </section>
  );
}
