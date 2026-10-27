"use client";

import { useRef } from "react";
import { LineChart, Calendar } from "lucide-react";
import type { SalesFiltersProps } from "./SalesFilters.logic";
import { inputClassName } from "./SalesFilters.logic";
import styles from "./SalesFilters.module.scss";

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
  const eventSelectRef = useRef<HTMLSelectElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className={styles.scope}>
      <div className={styles.viewGroup} role="group" aria-label="Tipo de vista">
        <button
          type="button"
          onClick={() => onSelectView("tickets")}
          aria-pressed={viewMode === "tickets"}
          className={styles.viewButton}
        >
          Vista por ticket 
          {/* ({ticketCount}) */}
        </button>
        <button
          type="button"
          onClick={() => onSelectView("pieces")}
          aria-pressed={viewMode === "pieces"}
          className={styles.viewButton}
        >
          Vista por piezas 
          {/* ({pieceCount}) */}
        </button>
      </div>

      <div className={styles.filtersContainer}>
        <div className={styles.searchInput}>
          <label className={styles.searchLabel}>
            <input
              type="search"
              value={searchText}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Busca por Nombre o ID"
              className={styles.filterInput}
            />
          </label>
        </div>

        <div className={styles.iconFilters}>
          <div className={styles.filterIcon}>
            <button
              type="button"
              onClick={() => eventSelectRef.current?.click()}
              title={`Evento: ${events.find((e) => e.id === selectedEvent)?.name || "Todos"}`}
              className={styles.iconButton}
              aria-label="Filtrar por evento"
            >
              <LineChart size={20} />
            </button>
            <select
              ref={eventSelectRef}
              value={selectedEvent}
              onChange={(event) => onSelectEvent(event.target.value)}
              className={styles.hiddenSelect}
              aria-label="Seleccionar evento"
            >
              <option value="all">Todos los eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterIcon}>
            <button
              type="button"
              onClick={() => dateInputRef.current?.click()}
              title={selectedDate || "Seleccionar fecha"}
              className={styles.iconButton}
              aria-label="Filtrar por fecha"
            >
              <Calendar size={20} />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(event) => onSelectDate(event.target.value)}
              className={styles.hiddenDateInput}
              aria-label="Seleccionar fecha"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
