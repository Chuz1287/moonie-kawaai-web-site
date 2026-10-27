"use client";

import { Calendar, ChevronDown, Search } from "lucide-react";
import type { SalesFiltersProps } from "./SalesFilters.logic";
import styles from "./SalesFilters.module.scss";

export default function SalesFilters({
  events,
  selectedEvent,
  selectedDate,
  searchText,
  viewMode,
  onSelectEvent,
  onSelectDate,
  onSearch,
  onSelectView,
}: SalesFiltersProps) {
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

        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Evento</span>
          <div className={styles.selectWrap}>
            <select
              value={selectedEvent}
              onChange={(event) => onSelectEvent(event.target.value)}
              className={styles.select}
              aria-label="Seleccionar evento"
            >
              <option value="all">Todos los eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className={styles.selectIcon} aria-hidden="true" />
          </div>
        </label>

        <label className={styles.dateField}>
          <span className={styles.fieldLabel}>Fecha</span>
          <div className={styles.dateWrap}>
            <Calendar size={14} className={styles.fieldIcon} aria-hidden="true" />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onSelectDate(event.target.value)}
              className={styles.dateInput}
              aria-label="Seleccionar fecha"
            />
          </div>
        </label>
      </div>
    </section>
  );
}
