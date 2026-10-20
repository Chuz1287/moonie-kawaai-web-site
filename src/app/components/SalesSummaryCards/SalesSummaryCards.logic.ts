import type { SalesViewMode } from "@/pages/sales/sales.logic";

export type SalesSummaryCardsProps = {
  totalRevenue: number;
  totalProfit: number;
  count: number;
  viewMode: SalesViewMode;
};
