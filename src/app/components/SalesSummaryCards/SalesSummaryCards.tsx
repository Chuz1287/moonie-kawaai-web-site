"use client";

import InfoCardSummary from "../InfoCardSummary";
import type { SalesSummaryCardsProps } from "./SalesSummaryCards.logic";

export default function SalesSummaryCards({
  totalRevenue,
  totalProfit,
  count,
  viewMode,
}: SalesSummaryCardsProps) {
  return (
    <section className="mb-6 flex flex-wrap gap-4" aria-label="Resumen de ventas">
      <InfoCardSummary
        label="Total vendido"
        value={`$${totalRevenue.toFixed(2)}`}
        textColor="text-emerald-300"
      />
      <InfoCardSummary
        label="Ganancia bruta"
        value={`$${totalProfit.toFixed(2)}`}
        textColor="text-violet-300"
      />
      <InfoCardSummary
        label={viewMode === "tickets" ? "Tickets" : "Piezas (líneas)"}
        value={count}
        textColor="text-white"
      />
    </section>
  );
}
