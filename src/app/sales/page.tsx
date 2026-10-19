"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SaleRecord } from "@/services/sales";
import {
  compareSalesNewestFirst,
  fetchSalesFromApi,
  getSaleProfit,
  groupSalesByDay,
} from "@/services/sales";

type EventOption = { id: string; name: string };
type SaleLine = NonNullable<SaleRecord["items"]>[number];
type DraftLine = { productId: string; productName: string; quantity: number; unitPrice: number };
type ViewMode = "tickets" | "pieces";
const PAGE_SIZE = 100;

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
}

function getLines(sale: SaleRecord): SaleLine[] {
  if (sale.items?.length) return sale.items;
  return [{
    productId: sale.productId,
    productName: sale.personaje ?? "Venta antigua",
    quantity: sale.cantidad ?? 0,
    unitPrice: sale.precio_venta_unitario ?? 0,
    costo_unitario: sale.costo_unitario ?? 0,
  }];
}

function getLineName(line: SaleLine) {
  return String(line.productName ?? line.name ?? "Producto");
}

function saleHasStableProductIds(sale: SaleRecord) {
  const lines = getLines(sale);
  return lines.length > 0 && lines.every((line) =>
    String(line.productId ?? line.product_id ?? "").trim().length > 0
  );
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("tickets");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [busySaleIds, setBusySaleIds] = useState<string[]>([]);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  async function reloadSales() {
    const updatedSales = await fetchSalesFromApi();
    setSales(updatedSales);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadSales() {
      try {
        const [salesFromApi, eventsResponse] = await Promise.all([
          fetchSalesFromApi(),
          fetch("/api/events"),
        ]);
        const eventsPayload = (await eventsResponse.json()) as { events?: EventOption[] };
        if (!cancelled) {
          setSales(salesFromApi);
          setEvents(eventsResponse.ok && Array.isArray(eventsPayload.events) ? eventsPayload.events : []);
          if (!eventsResponse.ok) setLoadError("No se pudieron cargar los eventos para mostrar el historial.");
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "No se pudieron cargar las ventas.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadSales();
    return () => { cancelled = true; };
  }, []);

  const filteredSales = useMemo(() => sales.filter((sale) => {
    const matchesEvent = selectedEvent === "all" || (sale.event_id ?? "default") === selectedEvent;
    const matchesDate = !selectedDate || sale.fecha === selectedDate;
    return matchesEvent && matchesDate;
  }), [sales, selectedEvent, selectedDate]);

  const matchingSales = useMemo(() => {
    const query = normalizeSearch(searchText);
    if (!query) return filteredSales;
    return filteredSales.filter((sale) => getLines(sale).some((line) =>
      normalizeSearch([
        getLineName(line),
        line.productId ?? line.product_id,
        line.name,
      ].join(" ")).includes(query)
    ));
  }, [filteredSales, searchText]);

  const eventNames = useMemo(() => new Map(events.map((event) => [event.id, event.name])), [events]);
  const groupedSales = useMemo(() => groupSalesByDay(matchingSales), [matchingSales]);
  const paginatedGroups = useMemo(() => {
    const result = groupedSales.reduce<{ groups: typeof groupedSales; remaining: number }>(
      (state, group) => {
        if (state.remaining <= 0) return state;
        const visibleItems = group.items.slice(0, state.remaining);
        return {
          remaining: state.remaining - visibleItems.length,
          groups: [...state.groups, {
            ...group,
            items: visibleItems,
            total: visibleItems.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0),
          }],
        };
      },
      { groups: [], remaining: visibleCount }
    );
    return result.groups;
  }, [groupedSales, visibleCount]);
  const pieces = useMemo(() => {
    const query = normalizeSearch(searchText);
    return filteredSales.flatMap((sale) => getLines(sale)
      .map((line, index) => ({ sale, line, index }))
      .filter(({ line }) => !query || normalizeSearch([
        getLineName(line),
        line.productId ?? line.product_id,
        line.name,
      ].join(" ")).includes(query))
    );
  }, [filteredSales, searchText]);
  const totalRevenue = matchingSales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);
  const totalProfit = matchingSales.reduce((sum, sale) => sum + getSaleProfit(sale), 0);
  const displayedCount = viewMode === "tickets" ? matchingSales.length : pieces.length;
  const getEventName = (eventId?: string | null) =>
    !eventId || eventId === "default" ? "Default" : eventNames.get(eventId) ?? eventId;

  function startEditing(sale: SaleRecord) {
    const lines = getLines(sale);
    if (!saleHasStableProductIds(sale)) {
      setMutationError(`No se abrió la edición del ticket ${sale.sale_number ?? sale.id}: esta venta antigua no contiene IDs de producto en todas sus piezas. Solicita recuperar/asociar esos IDs en Supabase antes de editarla; no se modificó ningún dato ni inventario.`);
      return;
    }
    setMutationError("");
    setEditError("");
    setEditingSale(sale);
    setDraftLines(lines.map((line) => ({
      productId: String(line.productId ?? line.product_id),
      productName: getLineName(line),
      quantity: Number(line.quantity ?? line.cantidad ?? 0),
      unitPrice: Number(line.unitPrice ?? line.precio_venta_unitario ?? 0),
    })));
  }

  async function handleSaveEdit() {
    if (!editingSale || savingEdit) return;
    setMutationError("");
    setEditError("");
    setSavingEdit(true);
    try {
      const response = await fetch(`/api/sales/${encodeURIComponent(editingSale.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: draftLines.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
        }),
      });
      const payload = await response.json() as { message?: string; sale?: SaleRecord };
      if (!response.ok || !payload.sale) throw new Error(payload.message ?? "No se pudo guardar la edición.");
      setSales((current) => current
        .map((sale) => sale.id === editingSale.id ? { ...sale, ...payload.sale } : sale)
        .sort(compareSalesNewestFirst));
      setEditingSale(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la edición.";
      setEditError(message);
      setMutationError(message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(sale: SaleRecord) {
    if (busySaleIds.includes(sale.id) || !window.confirm("¿Seguro que deseas borrar este ticket? El stock de todas sus piezas se restaurará.")) return;
    setMutationError("");
    setBusySaleIds((current) => [...current, sale.id]);
    try {
      const response = await fetch(`/api/sales/${encodeURIComponent(sale.id)}`, { method: "DELETE" });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "No se pudo eliminar la venta.");
      setSales((current) => current.filter((item) => item.id !== sale.id));
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "No se pudo eliminar la venta.");
    } finally {
      setBusySaleIds((current) => current.filter((id) => id !== sale.id));
    }
  }

  async function handleRefresh() {
    setLoading(true);
    setLoadError("");
    try {
      await reloadSales();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudieron actualizar las ventas.");
    } finally {
      setLoading(false);
    }
  }

  function actionButtons(sale: SaleRecord) {
    const busy = busySaleIds.includes(sale.id);
    const canEdit = saleHasStableProductIds(sale);
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startEditing(sale)}
            disabled={busy}
            aria-describedby={!canEdit ? `sale-edit-help-${sale.id}` : undefined}
            className="rounded-md border border-slate-600 px-2 py-1 text-xs font-bold text-slate-200 hover:border-violet-400 disabled:opacity-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(sale)}
            disabled={busy}
            className="rounded-md border border-rose-500/50 bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-200 disabled:opacity-50"
          >
            {busy ? "Borrando…" : "Borrar ticket"}
          </button>
        </div>
        {!canEdit && (
          <p id={`sale-edit-help-${sale.id}`} className="mt-2 max-w-md text-xs text-amber-200">
            No editable: faltan IDs de producto para ajustar el inventario con seguridad.
          </p>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400">Historial</p>
            <h1 className="mt-2 text-3xl font-black text-white">Ventas</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void handleRefresh()} disabled={loading}
              className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-violet-400 disabled:opacity-50">
              Actualizar
            </button>
            <Link href="/" className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-violet-400 hover:text-white">
              Volver al POS
            </Link>
          </div>
        </div>

        {loadError && <p role="alert" className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{loadError}</p>}
        {mutationError && <p role="alert" className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{mutationError}</p>}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Total vendido</p>
            <p className="mt-3 text-2xl font-black text-emerald-300">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Ganancia bruta</p>
            <p className="mt-3 text-2xl font-black text-violet-300">${totalProfit.toFixed(2)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {viewMode === "tickets" ? "Tickets" : "Piezas (líneas)"}
            </p>
            <p className="mt-3 text-2xl font-black text-white">{displayedCount}</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Tipo de vista">
            <button type="button" onClick={() => setViewMode("tickets")} aria-pressed={viewMode === "tickets"}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${viewMode === "tickets" ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
              Vista por ticket ({matchingSales.length})
            </button>
            <button type="button" onClick={() => setViewMode("pieces")} aria-pressed={viewMode === "pieces"}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${viewMode === "pieces" ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
              Vista por piezas ({pieces.length})
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Buscar pieza vendida
              <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)}
                placeholder="Nombre o ID del producto"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none" />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Filtrar por evento
              <select value={selectedEvent} onChange={(event) => setSelectedEvent(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white focus:border-violet-500 focus:outline-none">
                <option value="all">Todos los eventos</option>
                <option value="default">Default</option>
                {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Filtrar por fecha
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white focus:border-violet-500 focus:outline-none" />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Cargando ventas…</div>
        ) : displayedCount === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center text-slate-300">
            {searchText ? "No se encontraron piezas con esa búsqueda." : "No hay ventas registradas para estos filtros."}
          </div>
        ) : viewMode === "tickets" ? (
          <div className="space-y-6">
            {paginatedGroups.map((group) => (
              <section key={group.date} className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-white">{group.date}</h2>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300">${group.total.toFixed(2)}</span>
                </div>
                <div className="space-y-3">
                  {group.items.map((sale) => (
                    <article key={sale.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-white">Ticket {sale.sale_number ?? sale.id}</h3>
                          <p className="mt-1 text-xs text-slate-400">{sale.fecha} · {sale.hora} · {getEventName(sale.event_id)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-300">${Number(sale.total ?? 0).toFixed(2)}</p>
                          <p className="text-xs text-slate-400">Ganancia ${getSaleProfit(sale).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="mb-4 overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full min-w-[520px] text-left text-sm">
                          <thead className="bg-slate-800 text-xs uppercase text-slate-300">
                            <tr><th className="px-3 py-2">Pieza</th><th className="px-3 py-2">ID</th><th className="px-3 py-2">Cant.</th><th className="px-3 py-2">Precio</th><th className="px-3 py-2">Importe</th></tr>
                          </thead>
                          <tbody>
                            {getLines(sale).map((line, index) => (
                              <tr key={`${sale.id}-${line.productId ?? line.product_id ?? index}`} className="border-t border-slate-800 text-slate-200">
                                <td className="px-3 py-2">{getLineName(line)}</td>
                                <td className="px-3 py-2 text-slate-400">{line.productId ?? line.product_id ?? "—"}</td>
                                <td className="px-3 py-2">{line.quantity ?? line.cantidad ?? 0}</td>
                                <td className="px-3 py-2">${Number(line.unitPrice ?? line.precio_venta_unitario ?? 0).toFixed(2)}</td>
                                <td className="px-3 py-2">${(Number(line.quantity ?? line.cantidad ?? 0) * Number(line.unitPrice ?? line.precio_venta_unitario ?? 0)).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {actionButtons(sale)}
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {matchingSales.length > visibleCount && (
              <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold text-violet-200 hover:border-violet-400">
                Mostrar más tickets ({matchingSales.length - visibleCount} restantes)
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-lg">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-800 text-xs uppercase tracking-wide text-slate-300">
                <tr><th className="px-4 py-3">Pieza vendida</th><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Fecha / evento</th><th className="px-4 py-3">Cant.</th><th className="px-4 py-3">Precio unit.</th><th className="px-4 py-3">Importe</th><th className="px-4 py-3">Acciones</th></tr>
              </thead>
              <tbody>
                {pieces.slice(0, visibleCount).map(({ sale, line, index }) => {
                  const quantity = Number(line.quantity ?? line.cantidad ?? 0);
                  const unitPrice = Number(line.unitPrice ?? line.precio_venta_unitario ?? 0);
                  return (
                    <tr key={`${sale.id}-${line.productId ?? line.product_id ?? index}`} className="border-t border-slate-800 text-slate-200">
                      <td className="px-4 py-3 font-semibold">{getLineName(line)} <span className="text-xs text-slate-500">#{line.productId ?? line.product_id ?? "—"}</span></td>
                      <td className="px-4 py-3">{sale.sale_number ?? sale.id}</td>
                      <td className="px-4 py-3">{sale.fecha} · {getEventName(sale.event_id)}</td>
                      <td className="px-4 py-3">{quantity}</td>
                      <td className="px-4 py-3">${unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3">${(quantity * unitPrice).toFixed(2)}</td>
                      <td className="px-4 py-3">{actionButtons(sale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pieces.length > visibleCount && (
              <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="w-full border-t border-slate-800 px-4 py-3 font-bold text-violet-200 hover:bg-slate-800">
                Mostrar más piezas ({pieces.length - visibleCount} restantes)
              </button>
            )}
          </div>
        )}
      </div>

      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="edit-sale-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-300">Editar ticket</p>
                <h2 id="edit-sale-title" className="mt-1 text-xl font-black text-white">{editingSale.sale_number ?? editingSale.id}</h2>
              </div>
              <button type="button" onClick={() => setEditingSale(null)} className="rounded-lg px-3 py-1 text-slate-300 hover:bg-slate-800">Cerrar</button>
            </div>
            {editError && (
              <p role="alert" className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                No se guardaron los cambios: {editError}
              </p>
            )}
            <div className="space-y-3">
              {draftLines.map((line, index) => (
                <div key={`${line.productId}-${index}`} className="grid gap-3 rounded-xl border border-slate-800 p-3 sm:grid-cols-[1fr_120px_150px_auto] sm:items-end">
                  <div><p className="font-semibold text-white">{line.productName}</p><p className="text-xs text-slate-400">ID {line.productId}</p></div>
                  <label className="text-xs text-slate-400">Cantidad
                    <input type="number" min="1" step="1" value={line.quantity}
                      onChange={(event) => setDraftLines((current) => current.map((entry, i) => i === index ? { ...entry, quantity: Number(event.target.value) } : entry))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="text-xs text-slate-400">Precio unitario
                    <input type="number" min="0" step="0.01" value={line.unitPrice}
                      onChange={(event) => setDraftLines((current) => current.map((entry, i) => i === index ? { ...entry, unitPrice: Number(event.target.value) } : entry))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
                  </label>
                  <button type="button" disabled={draftLines.length <= 1}
                    onClick={() => setDraftLines((current) => current.filter((_, i) => i !== index))}
                    className="rounded-lg border border-rose-500/40 px-3 py-2 text-xs font-bold text-rose-200 disabled:opacity-40">Quitar pieza</button>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <p className="font-bold text-white">Nuevo total: ${draftLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0).toFixed(2)}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingSale(null)} className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300">Cancelar</button>
                <button type="button" onClick={() => void handleSaveEdit()} disabled={savingEdit || !draftLines.length || draftLines.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0)}
                  className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-500 disabled:opacity-50">
                  {savingEdit ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
