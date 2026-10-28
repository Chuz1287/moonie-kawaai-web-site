"use client";

import SaleEditDialog from "@/components/SaleEditDialog";
import SalesFilters from "@/components/SalesFilters";
import SalesHeader from "@/components/SalesHeader";
import SalesList from "@/components/SalesList";
import SalesSummaryCards from "@/components/SalesSummaryCards";
import styles from "./sales.module.scss";
import { useSalesHistory } from "./sales.logic";

export default function SalesHistoryPage() {
  const model = useSalesHistory();

  return (
    <main className={styles.scope}>
      <div className={styles.container}>
        <SalesHeader
          loading={model.loading}
          onRefresh={() => void model.handleRefresh()}
          events={model.events}
          selectedEvent={model.selectedEvent}
          onSelectEvent={model.setSelectedEvent}
        />

        {model.loadError && (
          <p role="alert" className={styles.alert}>
            {model.loadError}
          </p>
        )}
        {model.mutationError && (
          <p role="alert" className={styles.alert}>
            {model.mutationError}
          </p>
        )}

        <SalesFilters
          selectedDate={model.selectedDate}
          searchText={model.searchText}
          viewMode={model.viewMode}
          ticketCount={model.matchingSales.length}
          pieceCount={model.pieces.length}
          onSelectDate={model.setSelectedDate}
          onSearch={model.setSearchText}
          onSelectView={model.setViewMode}
        />

        <SalesSummaryCards
          totalRevenue={model.totalRevenue}
          totalProfit={model.totalProfit}
          count={model.displayedCount}
          viewMode={model.viewMode}
        />


        <SalesList model={model} />
      </div>

      <SaleEditDialog model={model} />
    </main>
  );
}
