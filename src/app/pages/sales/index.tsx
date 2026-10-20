"use client";

import SaleEditDialog from "@/components/SaleEditDialog";
import SalesFilters from "@/components/SalesFilters";
import SalesHeader from "@/components/SalesHeader";
import SalesList from "@/components/SalesList";
import SalesSummaryCards from "@/components/SalesSummaryCards";
import styles from "./sales.scss";
import { useSalesHistory } from "./sales.logic";

export default function SalesHistoryPage() {
  const model = useSalesHistory();

  return (
    <main className={`${styles.scope} bg-slate-950 px-4 py-8 text-slate-100`}>
      <div className="mx-auto max-w-7xl">
        <SalesHeader
          loading={model.loading}
          onRefresh={() => void model.handleRefresh()}
        />

        {model.loadError && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            {model.loadError}
          </p>
        )}
        {model.mutationError && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            {model.mutationError}
          </p>
        )}

        <SalesSummaryCards
          totalRevenue={model.totalRevenue}
          totalProfit={model.totalProfit}
          count={model.displayedCount}
          viewMode={model.viewMode}
        />

        <SalesFilters
          events={model.events}
          selectedEvent={model.selectedEvent}
          selectedDate={model.selectedDate}
          searchText={model.searchText}
          viewMode={model.viewMode}
          ticketCount={model.matchingSales.length}
          pieceCount={model.pieces.length}
          onSelectEvent={model.setSelectedEvent}
          onSelectDate={model.setSelectedDate}
          onSearch={model.setSearchText}
          onSelectView={model.setViewMode}
        />

        <SalesList model={model} />
      </div>

      <SaleEditDialog model={model} />
    </main>
  );
}
