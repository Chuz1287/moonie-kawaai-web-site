"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SaleRecord } from "@/services/sales";
import { getSaleProfit, groupSalesByDay } from "@/services/sales";

type EventOption = {
  id: string;
  name: string;
};

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSales() {
      try {
        const storedEvents = localStorage.getItem("moonie_kawaai_sales_channels");
        if (storedEvents) {
          const parsed = JSON.parse(storedEvents) as string[];
          if (!cancelled) {
            setEvents(
              parsed.map((name) => ({
                id: name,
                name,
              }))
            );
          }
        }

        const response = await fetch("/api/sales");
        const payload = (await response.json()) as { sales?: SaleRecord[] };

        if (!cancelled) {
          setSales(payload.sales ?? []);
        }
      } catch {
        if (!cancelled) {
          setSales([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSales();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSales = useMemo(() => {
    if (selectedEvent === "all") {
      return sales;
    }

    return sales.filter((sale) => (sale.event_id ?? "default") === selectedEvent);
  }, [sales, selectedEvent]);

  const groupedSales = useMemo(() => groupSalesByDay(filteredSales), [filteredSales]);
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + getSaleProfit(sale), 0);
  const getEventName = (eventId?: string | null) => {
    if (!eventId || eventId === "default") {
      return "Default";
    }

    return events.find((event) => event.id === eventId)?.name ?? eventId;
  };

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("No se pudo eliminar la venta");
      }

      setSales((current) => current.filter((sale) => sale.id !== id));
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400">
              Historial
            </p>
            <h1 className="mt-2 text-3xl font-black text-white">Ventas</h1>
          </div>

          <Link
            href="/"
            className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-violet-400 hover:text-white"
          >
            Volver al POS
          </Link>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Total vendido
            </p>
            <p className="mt-3 text-2xl font-black text-emerald-300">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Ganancia bruta
            </p>
            <p className="mt-3 text-2xl font-black text-violet-300">${totalProfit.toFixed(2)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Registros
            </p>
            <p className="mt-3 text-2xl font-black text-white">{filteredSales.length}</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Filtrar por evento
          </label>
          <select
            value={selectedEvent}
            onChange={(event) => setSelectedEvent(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
          >
            <option value="all">Todos los eventos</option>
            <option value="default">Default</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Cargando ventas...
          </div>
        ) : groupedSales.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center text-slate-300">
            No hay ventas registradas todavía.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedSales.map((group) => (
              <section
                key={group.date}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-white">{group.date}</h2>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300">
                    ${group.total.toFixed(2)}
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-800">
                  <div className="grid grid-cols-[1.4fr_1fr_0.7fr_0.8fr_0.8fr_0.8fr] bg-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                    <span>Producto</span>
                    <span>Evento</span>
                    <span>Cant.</span>
                    <span>Total</span>
                    <span>Gan.</span>
                    <span>Acción</span>
                  </div>

                  {group.items.map((sale) => (
                    <div
                      key={`${sale.id}-${sale.hora}`}
                      className="grid grid-cols-[1.4fr_1fr_0.7fr_0.8fr_0.8fr_0.8fr] border-t border-slate-800 px-4 py-3 text-sm text-slate-200"
                    >
                      <span>{sale.personaje}</span>
                      <span>{getEventName(sale.event_id)}</span>
                      <span>{sale.cantidad}</span>
                      <span>${Number(sale.total ?? 0).toFixed(2)}</span>
                      <span>${getSaleProfit(sale).toFixed(2)}</span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-600 px-2 py-1 text-[10px] font-bold text-slate-200"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sale.id)}
                          className="rounded-md border border-rose-500/50 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-200"
                        >
                          Borrar
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
