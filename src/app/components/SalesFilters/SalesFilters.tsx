"use client";

import { Calendar, Search } from "lucide-react";
import type { SalesFiltersProps } from "./SalesFilters.logic";
import styles from "./SalesFilters.module.scss";

type SalesFiltersViewProps = Omit<
  SalesFiltersProps,
  "events" | "selectedEvent" | "onSelectEvent"
>;

export default function SalesFilters({
  selectedDate,
  searchText,
  viewMode,
  onSelectDate,
  onSearch,
  onSelectView,
}: SalesFiltersViewProps) {
  return (
    <section className={styles.scope} aria-label="Filtros de ventas">
      <div className={styles.viewGroup} role="group" aria-label="Tipo de vista">
        <button
          type="button"
          onClick={() => onSelectView("tickets")}
          aria-pressed={viewMode === "tickets"}
          className={styles.viewButton}
        >
          Por ticket
        </button>
        <button
          type="button"
          onClick={() => onSelectView("pieces")}
          aria-pressed={viewMode === "pieces"}
          className={styles.viewButton}
        >
          Por piezas
        </button>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.searchBar}>
          <label className={styles.searchField}>
            <Search size={16} className={styles.fieldIcon} aria-hidden="true" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Buscar por ticket o producto..."
              className={styles.searchInput}
            />
          </label>

          <span className={styles.divider} aria-hidden="true" />

          <label className={styles.dateField}>
            <Calendar size={14} className={styles.fieldIcon} aria-hidden="true" />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onSelectDate(event.target.value)}
              className={styles.dateInput}
              aria-label="Seleccionar fecha"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
