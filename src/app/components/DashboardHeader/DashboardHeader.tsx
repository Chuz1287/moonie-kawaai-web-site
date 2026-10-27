"use client";

import Link from "next/link";
import type { PosDashboardModel } from "@/pages/pos/pos.logic";
import styles from "./DashboardHeader.module.scss";
import { PenLine } from "lucide-react";

export default function DashboardHeader({ model }: { model: PosDashboardModel }) {
  return (
    <>
      <div className={styles.topSection}>
        <div className={styles.titleBlock}>
          <p className={styles.badge}>POS - Fase 1</p>
          <h1 className={styles.title}>Monie Kawaai POS</h1>
        </div>

        {/* <div className={styles.actionBar}>
          <span className={styles.syncBadge}>Sincronización activa</span>
          <button
            type="button"
            onClick={() => void model.handleExportProducts()}
            disabled={model.isExportingProducts}
            className={styles.exportButton}
          >
            {model.isExportingProducts ? "Preparando Excel..." : "Descargar catálogo (.xlsx)"}
          </button>
          <Link href="/sales" className={styles.salesLink}>
            Ventas
          </Link>
        </div> */}
        <div className={styles.eventSection}>
          {/* <label className={styles.eventLabel}>Evento de venta</label> */}
          <select
            value={model.selectedEvent}
            onChange={(event) => {
              model.setSelectedEvent(event.target.value);
              localStorage.setItem("moonie_kawaai_selected_event", event.target.value);
            }}
            className={styles.eventSelect}
          >
            {model.salesChannels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => model.setIsEventModalOpen(true)}
            className={styles.createEventButton}
          >
            +
          </button>

          <button
            type="button"
            onClick={() => model.setIsEventsAndExpensesModalOpen(true)}
            className={styles.manageEventsLink}
          >
            <PenLine />
          </button>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* <div className={styles.statusBox}>{model.status}</div> */}
      </div>
    </>
  );
}
