export type EventSalesRanking = {
  name: string;
  unitsSold: number;
  salesTotal: number;
  grossProfit: number | null;
};

export type EventFigurePriceRanking = {
  id: string;
  name: string;
  highestUnitPrice: number;
  unitsSold: number;
  salesTotal: number;
};

export type EventDailySales = {
  date: string;
  salesCount: number;
  salesTotal: number;
};

export type EventPerformance = {
  salesTotal: number;
  expensesTotal: number;
  merchandiseCost: number;
  totalInvestment: number;
  grossProfit: number;
  netProfit: number;
  netMarginPercent: number | null;
  roiPercent: number | null;
  balance: number;
  amountToBreakEven: number;
  incompleteSaleCount: number;
  salesCount: number;
  unitsSold: number;
  averageTicket: number;
  topSeries: EventSalesRanking[];
  topCharacters: EventSalesRanking[];
  topFiguresByPrice: EventFigurePriceRanking[];
  dailySales: EventDailySales[];
};
