import type { EventOption, SalesViewMode } from "@/pages/sales/sales.logic";

export type SalesFiltersProps = {
  events: EventOption[];
  selectedEvent: string;
  selectedDate: string;
  searchText: string;
  viewMode: SalesViewMode;
  ticketCount: number;
  pieceCount: number;
  onSelectEvent: (eventId: string) => void;
  onSelectDate: (date: string) => void;
  onSearch: (query: string) => void;
  onSelectView: (view: SalesViewMode) => void;
};

export const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none";
