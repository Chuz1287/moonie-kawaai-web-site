"use client";

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
  return (
    <section className={styles.scope}>
      <div className={styles.viewGroup} role="group" aria-label="Tipo de vista">
        <button
          type="button"
          onClick={() => onSelectView("tickets")}
          aria-pressed={viewMode === "tickets"}
          className={styles.viewButton}
        >
          Vista por ticket ({ticketCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectView("pieces")}
          aria-pressed={viewMode === "pieces"}
          className={styles.viewButton}
        >
          Vista por piezas ({pieceCount})
        </button>
      </div>

      <div className={styles.filtersContainer}>
        <label className={styles.filterLabel}>
          Buscar pieza vendida
          <input
            type="search"
            value={searchText}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Nombre o ID del producto"
            className={styles.filterInput}
          />
        </label>
        <label className={styles.filterLabel}>
          Filtrar por evento
          <select
            value={selectedEvent}
            onChange={(event) => onSelectEvent(event.target.value)}
            className={styles.filterInput}
          >
            <option value="all">Todos los eventos</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterLabel}>
          Filtrar por fecha
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onSelectDate(event.target.value)}
            className={styles.filterInput}
          />
        </label>
      </div>
    </section>
  );
}
