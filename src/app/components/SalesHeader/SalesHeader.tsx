"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { EventOption } from "@/pages/sales/sales.logic";
import type { SalesHeaderProps } from "./SalesHeader.logic";
import styles from "./SalesHeader.module.scss";

type SalesHeaderViewProps = SalesHeaderProps & {
  events: EventOption[];
  selectedEvent: string;
  onSelectEvent: (eventId: string) => void;
};

export default function SalesHeader({
  events,
  selectedEvent,
  onSelectEvent,
}: SalesHeaderViewProps) {
  return (
    <header className={styles.scope}>
      <div className={styles.titleSection}>
        <p className={styles.subtitle}>Punto de venta</p>
        <h1 className={styles.title}>
          <span className={styles.eventWrap}>
            <select
              value={selectedEvent}
              onChange={(event) => onSelectEvent(event.target.value)}
              className={styles.eventSelect}
              aria-label="Seleccionar evento"
            >
              <option value="all">Todos los eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            <ChevronDown size={20} className={styles.eventIcon} aria-hidden="true" />
          </span>
        </h1>
      </div>
      {/* <div className={styles.actions}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={styles.button}
        >
          Actualizar
        </button>
        <Link
          href="/"
          className={styles.buttonPrimary}
        >
          Volver al POS
        </Link>
      </div> */}
    </header>
  );
}
