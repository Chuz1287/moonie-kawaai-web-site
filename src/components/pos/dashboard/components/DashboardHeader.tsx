"use client";

import Link from "next/link";
import type { PosDashboardModel } from "../dashboard.logic";

export default function DashboardHeader({ model }: { model: PosDashboardModel }) {
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
            POS - Fase 1
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">Monie Kawaai POS</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
            Sincronización activa
          </span>
          <button
            type="button"
            onClick={() => void model.handleExportProducts()}
            disabled={model.isExportingProducts}
            className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-wait disabled:opacity-60"
          >
            {model.isExportingProducts ? "Preparando Excel..." : "Descargar catálogo (.xlsx)"}
          </button>
          <Link
            href="/sales"
            className="rounded-full border border-violet-400/60 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20"
          >
            Ventas
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
          {model.status}
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-800 p-3">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Evento de venta
          </label>
          <button
            type="button"
            onClick={() => model.setIsEventModalOpen(true)}
            className="w-full rounded-xl border border-violet-400/50 bg-violet-500/10 px-3 py-2 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20"
          >
            Crear evento
          </button>
          <select
            value={model.selectedEvent}
            onChange={(event) => {
              model.setSelectedEvent(event.target.value);
              localStorage.setItem("moonie_kawaai_selected_event", event.target.value);
            }}
            className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
          >
            <option value="default">Default</option>
            {model.salesChannels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
          <Link
            href="/events"
            className="text-xs font-semibold text-violet-300 hover:text-violet-200"
          >
            Administrar eventos y gastos
          </Link>
        </div>
      </div>
    </>
  );
}
