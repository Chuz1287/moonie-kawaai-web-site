"use client";

import { useEffect, useMemo, useState } from "react";
import type { SaleRecord } from "@/services/sales";
import {
  compareSalesNewestFirst,
  fetchSalesFromApi,
  getSaleProfit,
  groupSalesByDay,
} from "@/services/sales";

export type EventOption = { id: string; name: string };
export type SaleLine = NonNullable<SaleRecord["items"]>[number];
export type DraftLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};
export type SalesViewMode = "tickets" | "pieces";

const PAGE_SIZE = 100;

export function normalizeSaleSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
}

export function getSaleLines(sale: SaleRecord): SaleLine[] {
  if (sale.items?.length) return sale.items;
  return [{
    productId: sale.productId,
    productName: sale.personaje ?? "Venta antigua",
    quantity: sale.cantidad ?? 0,
    unitPrice: sale.precio_venta_unitario ?? 0,
    costo_unitario: sale.costo_unitario ?? 0,
  }];
}

export function getSaleLineName(line: SaleLine) {
  return String(line.productName ?? line.name ?? "Producto");
}

export function saleHasStableProductIds(sale: SaleRecord) {
  const lines = getSaleLines(sale);
  return lines.length > 0 && lines.every((line) =>
    String(line.productId ?? line.product_id ?? "").trim().length > 0
  );
}

export function useSalesHistory() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<SalesViewMode>("tickets");
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
          setEvents(
            eventsResponse.ok && Array.isArray(eventsPayload.events)
              ? eventsPayload.events
              : []
          );
          if (!eventsResponse.ok) {
            setLoadError("No se pudieron cargar los eventos para mostrar el historial.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "No se pudieron cargar las ventas."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSales();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSales = useMemo(
    () => sales.filter((sale) => {
      const matchesEvent =
        selectedEvent === "all" || (sale.event_id ?? "default") === selectedEvent;
      const matchesDate = !selectedDate || sale.fecha === selectedDate;
      return matchesEvent && matchesDate;
    }),
    [sales, selectedEvent, selectedDate]
  );

  const matchingSales = useMemo(() => {
    const query = normalizeSaleSearch(searchText);
    if (!query) return filteredSales;
    return filteredSales.filter((sale) =>
      getSaleLines(sale).some((line) =>
        normalizeSaleSearch([
          getSaleLineName(line),
          line.productId ?? line.product_id,
          line.name,
        ].join(" ")).includes(query)
      )
    );
  }, [filteredSales, searchText]);

  const eventNames = useMemo(
    () => new Map(events.map((event) => [event.id, event.name])),
    [events]
  );
  const groupedSales = useMemo(() => groupSalesByDay(matchingSales), [matchingSales]);
  const paginatedGroups = useMemo(() => {
    const result = groupedSales.reduce<{
      groups: typeof groupedSales;
      remaining: number;
    }>(
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
    const query = normalizeSaleSearch(searchText);
    return filteredSales.flatMap((sale) =>
      getSaleLines(sale)
        .map((line, index) => ({ sale, line, index }))
        .filter(({ line }) =>
          !query || normalizeSaleSearch([
            getSaleLineName(line),
            line.productId ?? line.product_id,
            line.name,
          ].join(" ")).includes(query)
        )
    );
  }, [filteredSales, searchText]);

  const totalRevenue = matchingSales.reduce(
    (sum, sale) => sum + Number(sale.total ?? 0),
    0
  );
  const totalProfit = matchingSales.reduce((sum, sale) => sum + getSaleProfit(sale), 0);
  const displayedCount = viewMode === "tickets" ? matchingSales.length : pieces.length;
  const getEventName = (eventId?: string | null) =>
    !eventId || eventId === "default" ? "Default" : eventNames.get(eventId) ?? eventId;

  function startEditing(sale: SaleRecord) {
    const lines = getSaleLines(sale);
    if (!saleHasStableProductIds(sale)) {
      setMutationError(
        `No se abrió la edición del ticket ${sale.sale_number ?? sale.id}: esta venta antigua no contiene IDs de producto en todas sus piezas. Solicita recuperar/asociar esos IDs en Supabase antes de editarla; no se modificó ningún dato ni inventario.`
      );
      return;
    }

    setMutationError("");
    setEditError("");
    setEditingSale(sale);
    setDraftLines(lines.map((line) => ({
      productId: String(line.productId ?? line.product_id),
      productName: getSaleLineName(line),
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
          items: draftLines.map(({ productId, quantity, unitPrice }) => ({
            productId,
            quantity,
            unitPrice,
          })),
        }),
      });
      const payload = await response.json() as { message?: string; sale?: SaleRecord };
      if (!response.ok || !payload.sale) {
        throw new Error(payload.message ?? "No se pudo guardar la edición.");
      }
      setSales((current) => current
        .map((sale) => sale.id === editingSale.id ? { ...sale, ...payload.sale } : sale)
        .sort(compareSalesNewestFirst));
      setEditingSale(null);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "No se pudo guardar la edición.";
      setEditError(message);
      setMutationError(message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(sale: SaleRecord) {
    if (
      busySaleIds.includes(sale.id) ||
      !window.confirm("¿Seguro que deseas borrar este ticket? El stock de todas sus piezas se restaurará.")
    ) {
      return;
    }

    setMutationError("");
    setBusySaleIds((current) => [...current, sale.id]);
    try {
      const response = await fetch(`/api/sales/${encodeURIComponent(sale.id)}`, {
        method: "DELETE",
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "No se pudo eliminar la venta.");
      }
      setSales((current) => current.filter((item) => item.id !== sale.id));
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "No se pudo eliminar la venta."
      );
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
      setLoadError(
        error instanceof Error ? error.message : "No se pudieron actualizar las ventas."
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    sales,
    events,
    selectedEvent,
    setSelectedEvent,
    selectedDate,
    setSelectedDate,
    searchText,
    setSearchText,
    viewMode,
    setViewMode,
    loading,
    loadError,
    mutationError,
    busySaleIds,
    editingSale,
    setEditingSale,
    draftLines,
    setDraftLines,
    savingEdit,
    editError,
    visibleCount,
    setVisibleCount,
    matchingSales,
    pieces,
    paginatedGroups,
    totalRevenue,
    totalProfit,
    displayedCount,
    getEventName,
    startEditing,
    handleSaveEdit,
    handleDelete,
    handleRefresh,
  };
}

export type SalesHistoryModel = ReturnType<typeof useSalesHistory>;
