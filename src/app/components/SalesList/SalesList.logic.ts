import type { SaleRecord } from "@/services/sales";

export type SalesListProps = {
  model: {
    paginatedGroups: Array<{
      date: string;
      items: SaleRecord[];
      total: number;
    }>;
    pieces: Array<{
      sale: SaleRecord;
      line: NonNullable<SaleRecord["items"]>[number];
      index: number;
    }>;
    viewMode: "tickets" | "pieces";
    visibleCount: number;
    busySaleIds: string[];
    startEditing: (sale: SaleRecord) => void;
    handleDelete: (sale: SaleRecord) => Promise<void>;
    setVisibleCount: (count: number) => void;
    getEventName: (eventId?: string | null) => string;
  };
};
