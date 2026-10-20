"use client";

import type { SalesFiltersProps } from "./SalesFilters.logic";
import { inputClassName } from "./SalesFilters.logic";

export default function SalesFilters({
  events,
  selectedEvent,
  selectedDate,
  searchText,
  viewMode,
  ticketCount,
  pieceCount,
  onSelectEvent,
  onSelectDate,
  onSearch,
  onSelectView,
}: SalesFiltersProps) {
  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Tipo de vista">
        <button
          type="button"
          onClick={() => onSelectView("tickets")}
          aria-pressed={viewMode === "tickets"}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            viewMode === "tickets"
              ? "bg-violet-600 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Vista por ticket ({ticketCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectView("pieces")}
          aria-pressed={viewMode === "pieces"}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            viewMode === "pieces"
              ? "bg-violet-600 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Vista por piezas ({pieceCount})
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Buscar pieza vendida
          <input
            type="search"
            value={searchText}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Nombre o ID del producto"
            className={inputClassName}
          />
        </label>
        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Filtrar por evento
          <select
            value={selectedEvent}
            onChange={(event) => onSelectEvent(event.target.value)}
            className={inputClassName}
          >
            <option value="all">Todos los eventos</option>
            <option value="default">Default</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Filtrar por fecha
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onSelectDate(event.target.value)}
            className={inputClassName}
          />
        </label>
      </div>
    </section>
  );
}
