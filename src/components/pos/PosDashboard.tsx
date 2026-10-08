"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addProductToCart,
  calculateCartTotals,
  removeProductFromCart,
  updateCartItemPrice,
  updateCartItemQuantity,
} from "@/services/pos";
import type { CartItem, Product } from "@/types/store";
import CartPanel from "./CartPanel";
import ProductGrid from "./ProductGrid";

type EventOption = {
  id: string;
  name: string;
  location?: string | null;
};

type EventExpense = {
  id: string;
  event_id: string;
  category: string;
  description: string;
  amount: number;
  created_at: string;
};

const expenseCategories = ["Stand / piso", "Comida", "Sueldos", "Caseta", "Gasolina"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

export default function PosDashboard() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Listo para vender");
  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("default");
  const [salesChannels, setSalesChannels] = useState<EventOption[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [managedEventId, setManagedEventId] = useState("");
  const [eventExpenses, setEventExpenses] = useState<EventExpense[]>([]);
  const [expenseCategory, setExpenseCategory] = useState(expenseCategories[0]);
  const [customExpenseCategory, setCustomExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [eventModalStatus, setEventModalStatus] = useState("");
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState("");
  const [productCatalog, setProductCatalog] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products");
        const payload = (await response.json()) as { products?: Product[] };

        if (!cancelled) {
          setProductCatalog(payload.products ?? []);
          setStatus("Catálogo cargado desde Supabase");
        }
      } catch {
        if (!cancelled) {
          setStatus("No se pudo cargar el catálogo desde Supabase");
        }
      }
    }

    async function loadEvents() {
      try {
        const response = await fetch("/api/events");
        const payload = (await response.json()) as { events?: EventOption[]; message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "No se pudieron cargar los eventos.");
        }

        if (!cancelled) {
          const events = Array.isArray(payload.events) ? payload.events : [];
          setSalesChannels(events);

          const savedEvent = localStorage.getItem("moonie_kawaai_selected_event");
          if (savedEvent && events.some((event) => event.id === savedEvent)) {
            setSelectedEvent(savedEvent);
          }
          setManagedEventId((current) =>
            current || (savedEvent && events.some((event) => event.id === savedEvent) ? savedEvent : events[0]?.id ?? "")
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "No se pudieron cargar los eventos de Supabase");
        }
      }
    }

    void loadProducts();
    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEventExpenses() {
      if (!isEventModalOpen || !managedEventId) {
        setEventExpenses([]);
        return;
      }

      try {
        const response = await fetch(`/api/events/${encodeURIComponent(managedEventId)}/expenses`);
        const payload = (await response.json()) as { expenses?: EventExpense[]; message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "No se pudieron cargar los gastos del evento.");
        }

        if (!cancelled) {
          setEventExpenses(Array.isArray(payload.expenses) ? payload.expenses : []);
        }
      } catch (error) {
        if (!cancelled) {
          setEventModalStatus(error instanceof Error ? error.message : "No se pudieron cargar los gastos del evento.");
        }
      }
    }

    void loadEventExpenses();
    return () => {
      cancelled = true;
    };
  }, [isEventModalOpen, managedEventId]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) {
      return productCatalog.slice(0, 6);
    }

    const term = search.toLowerCase();

    return productCatalog.filter((product) =>
      [product.name, product.category, product.shortDescription]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [productCatalog, search]);

  const inventorySummary = useMemo(() => {
    const totalInventoryCost = productCatalog.reduce(
      (sum, product) => sum + (product.cost ?? product.price * 0.7) * product.stock,
      0
    );
    const totalSaleValue = productCatalog.reduce(
      (sum, product) => sum + product.price * product.stock,
      0
    );
    const grossProfit = totalSaleValue - totalInventoryCost;
    const grossMarginPercent = totalSaleValue > 0 ? (grossProfit / totalSaleValue) * 100 : 0;
    const markupPercent = totalInventoryCost > 0 ? (grossProfit / totalInventoryCost) * 100 : 0;
    const markupExcessPercent = Math.max(0, markupPercent - 100);
    const markupExcessValue = Math.max(0, grossProfit - totalInventoryCost);

    return {
      totalInventoryCost,
      totalSaleValue,
      grossProfit,
      grossMarginPercent,
      markupPercent,
      markupExcessPercent,
      markupExcessValue,
    };
  }, [productCatalog]);

  const totals = useMemo(() => calculateCartTotals(cart, productCatalog), [cart, productCatalog]);
  const hasCartItems = cart.length > 0;
  const totalEventExpenses = useMemo(
    () => eventExpenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0),
    [eventExpenses]
  );

  const handleAddToCart = (product: { id: string; name: string; stock?: number }) => {
    const stockLimit = Math.max(0, Number(product.stock ?? 0));

    setCart((current) => addProductToCart(current, product.id, 1, undefined, stockLimit));

    if (stockLimit <= 0) {
      setStatus(`${product.name} no tiene stock disponible`);
      return;
    }

    setStatus(`${product.name} agregado al carrito`);
  };

  const handleAddStock = async (product: Product, quantity: number) => {
    const amount = Math.max(1, Number(quantity) || 1);

    try {
      const response = await fetch("/api/products/stock", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          delta: amount,
          operation: "add",
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; product?: Product; message?: string };

      if (!response.ok || !payload.product) {
        throw new Error(payload.message ?? "No se pudo actualizar el stock");
      }

      setProductCatalog((current) =>
        current.map((entry) => (entry.id === product.id ? payload.product! : entry))
      );
      setStatus(`Stock de ${product.name} actualizado +${amount}. ${payload.message ?? "Sincronizado en vivo."}`);
      return;
    } catch (error) {
      console.error("Add stock API failed", error);
      setStatus(`No se pudo actualizar el stock de ${product.name} desde la API.`);
    }
  };

  const handleChangeQuantity = (productId: string, quantity: number) => {
    const product = productCatalog.find((entry) => entry.id === productId);
    const stockLimit = product ? Math.max(0, Number(product.stock ?? 0)) : Number.POSITIVE_INFINITY;

    setCart((current) => updateCartItemQuantity(current, productId, quantity, stockLimit));
  };

  const handleChangePrice = (productId: string, unitPrice: number) => {
    setCart((current) => updateCartItemPrice(current, productId, unitPrice));
  };

  const handleRemove = (productId: string) => {
    setCart((current) => removeProductFromCart(current, productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setStatus("El carrito está vacío");
      return;
    }

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: selectedEvent || "default",
          cart,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        sale?: unknown;
        products?: Product[];
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "No se pudo registrar la venta");
      }

      if (Array.isArray(payload.products)) {
        setProductCatalog(payload.products);
      }

      setStatus(payload.message ?? "Venta registrada y stock actualizado en vivo.");
    } catch (error) {
      console.error("Checkout sync failed", error);
      setStatus("No se pudo registrar la venta en la API en vivo.");
    } finally {
      setCart([]);
      setIsCartOpen(false);
    }
  };

  const handleSaveChannel = async () => {
    const normalized = eventName.trim();

    if (!normalized || isSavingEvent) {
      return;
    }

    setIsSavingEvent(true);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalized, location: eventLocation.trim() }),
      });
      const payload = (await response.json()) as { event?: EventOption; message?: string };

      if (!response.ok || !payload.event) {
        throw new Error(payload.message ?? "No se pudo guardar el evento.");
      }

      setSalesChannels((current) => [
        ...current.filter((event) => event.id !== payload.event!.id),
        payload.event!,
      ]);
      setSelectedEvent(payload.event.id);
      localStorage.setItem("moonie_kawaai_selected_event", payload.event.id);
      setStatus(`Evento activo: ${payload.event.name}`);
      setEventModalStatus(`Evento creado y activado: ${payload.event.name}. Ahora puedes registrar sus gastos.`);
      setManagedEventId(payload.event.id);
      setEventExpenses([]);
      setEventName("");
      setEventLocation("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el evento.";
      setStatus(message);
      setEventModalStatus(message);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleSaveEventExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const category = expenseCategory === "__custom__" ? customExpenseCategory.trim() : expenseCategory;

    if (!managedEventId || !category || isSavingExpense) {
      return;
    }

    setIsSavingExpense(true);
    setEventModalStatus("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(managedEventId)}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount: Number(expenseAmount),
        }),
      });
      const payload = (await response.json()) as { expense?: EventExpense; message?: string };

      if (!response.ok || !payload.expense) {
        throw new Error(payload.message ?? "No se pudo guardar el gasto.");
      }

      setEventExpenses((current) => [payload.expense!, ...current]);
      setExpenseCategory(expenseCategories[0]);
      setCustomExpenseCategory("");
      setExpenseAmount("");
      setEventModalStatus("Gasto registrado en el evento.");
    } catch (error) {
      setEventModalStatus(error instanceof Error ? error.message : "No se pudo guardar el gasto.");
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteEvent = async (event: EventOption) => {
    if (deletingEventId || !window.confirm(`¿Borrar el evento "${event.name}" y sus gastos? Las ventas históricas no se borrarán.`)) {
      return;
    }

    setDeletingEventId(event.id);
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(event.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "No se pudo borrar el evento.");
      }

      setSalesChannels((current) => current.filter((item) => item.id !== event.id));
      const remainingEvents = salesChannels.filter((item) => item.id !== event.id);
      if (selectedEvent === event.id) {
        setSelectedEvent("default");
        localStorage.setItem("moonie_kawaai_selected_event", "default");
      }
      if (managedEventId === event.id) {
        setManagedEventId(remainingEvents[0]?.id ?? "");
        setEventExpenses([]);
      }
      const message = `Evento eliminado: ${event.name}`;
      setStatus(message);
      setEventModalStatus(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo borrar el evento.";
      setStatus(message);
      setEventModalStatus(message);
    } finally {
      setDeletingEventId("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-32 pt-6 text-slate-100 xl:pb-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
                POS - Fase 1
              </p>
              <h1 className="mt-2 text-3xl font-black text-white">Monie Kawaai POS</h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                Sincronización activa
              </span>
              <Link
                href="/sales"
                className="rounded-full border border-violet-400/60 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20"
              >
                Ventas
              </Link>
              <button
                type="button"
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-500"
              >
                Sincronizar
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
              {status}
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-800 p-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Evento de venta
              </label>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(true)}
                className="w-full rounded-xl border border-violet-400/50 bg-violet-500/10 px-3 py-2 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20"
              >
                Crear evento
              </button>
              <select
                value={selectedEvent}
                onChange={(event) => {
                  setSelectedEvent(event.target.value);
                  localStorage.setItem("moonie_kawaai_selected_event", event.target.value);
                }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="default">Default</option>
                {salesChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
              <Link href="/events" className="text-xs font-semibold text-violet-300 hover:text-violet-200">
                Administrar eventos y gastos
              </Link>
            </div>
          </div>
        </header>

        {isEventModalOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isSavingEvent) {
                setIsEventModalOpen(false);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-event-title"
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 id="create-event-title" className="text-xl font-black text-white">Crear evento</h2>
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  disabled={isSavingEvent || isSavingExpense}
                  aria-label="Cerrar modal"
                  className="rounded-lg border border-slate-700 px-3 py-1 text-lg text-slate-300 hover:text-white"
                >
                  ×
                </button>
              </div>

              {eventModalStatus && (
                <p role="status" className="mb-4 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                  {eventModalStatus}
                </p>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSaveChannel();
                }}
                className="space-y-4"
              >
                <label className="block text-sm font-semibold text-slate-300">
                  Nombre del evento
                  <input
                    required
                    autoFocus
                    value={eventName}
                    onChange={(event) => setEventName(event.target.value)}
                    placeholder="Convención, bazar..."
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-500"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-300">
                  Lugar
                  <input
                    value={eventLocation}
                    onChange={(event) => setEventLocation(event.target.value)}
                    placeholder="Recinto o ciudad"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSavingEvent || !eventName.trim()}
                  className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isSavingEvent ? "Guardando..." : "Crear y activar evento"}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-800 pt-5">
                <h3 className="mb-3 text-sm font-bold text-slate-200">Eventos existentes</h3>
                {salesChannels.length === 0 ? (
                  <p className="text-sm text-slate-400">Aún no hay eventos.</p>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {salesChannels.map((event) => (
                      <li key={event.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{event.name}</p>
                          <p className="truncate text-xs text-slate-400">{event.location || "Lugar sin especificar"}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => setManagedEventId(event.id)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${managedEventId === event.id ? "border-violet-400 bg-violet-500/15 text-violet-100" : "border-slate-700 text-slate-300 hover:border-violet-400"}`}
                          >
                            Gastos
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteEvent(event)}
                            disabled={Boolean(deletingEventId)}
                            className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                          >
                            {deletingEventId === event.id ? "Borrando..." : "Borrar"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <section className="mt-6 border-t border-slate-800 pt-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <label className="min-w-[220px] flex-1 text-sm font-semibold text-slate-300">
                    Administrar gastos de
                    <select
                      value={managedEventId}
                      onChange={(event) => setManagedEventId(event.target.value)}
                      disabled={salesChannels.length === 0}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    >
                      <option value="">Selecciona un evento</option>
                      {salesChannels.map((event) => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </label>
                  <p className="text-lg font-black text-rose-300">{formatCurrency(totalEventExpenses)}</p>
                </div>

                {managedEventId ? (
                  <>
                    <form onSubmit={handleSaveEventExpense} className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm text-slate-300">
                        Categoría
                        <select
                          value={expenseCategory}
                          onChange={(event) => setExpenseCategory(event.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                        >
                          {expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                          <option value="__custom__">Nueva categoría...</option>
                        </select>
                      </label>
                      {expenseCategory === "__custom__" && (
                        <label className="text-sm text-slate-300">
                          Nueva categoría
                          <input
                            required
                            value={customExpenseCategory}
                            onChange={(event) => setCustomExpenseCategory(event.target.value)}
                            placeholder="Ej. hospedaje"
                            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                          />
                        </label>
                      )}
                      <label className="text-sm text-slate-300">
                        Importe
                        <input
                          required
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={expenseAmount}
                          onChange={(event) => setExpenseAmount(event.target.value)}
                          placeholder="0.00"
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={isSavingExpense}
                        className="self-end rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {isSavingExpense ? "Guardando..." : "Agregar gasto"}
                      </button>
                    </form>

                    <div className="mt-4 max-h-48 divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-800">
                      {eventExpenses.length === 0 ? (
                        <p className="p-4 text-center text-sm text-slate-400">Este evento todavía no tiene gastos.</p>
                      ) : eventExpenses.map((expense) => (
                        <article key={expense.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{expense.category}</p>
                            <p className="text-xs text-slate-400">{new Date(expense.created_at).toLocaleDateString("es-MX")}</p>
                          </div>
                          <strong className="shrink-0 text-sm text-rose-300">{formatCurrency(Number(expense.amount))}</strong>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                    Crea o selecciona un evento para administrar sus gastos.
                  </p>
                )}
              </section>
            </section>
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Costo total
            </p>
            <p className="mt-3 text-2xl font-black text-white">
              {formatCurrency(inventorySummary.totalInventoryCost)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Venta total
            </p>
            <p className="mt-3 text-2xl font-black text-emerald-300">
              {formatCurrency(inventorySummary.totalSaleValue)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Ganancia bruta
            </p>
            <p className="mt-3 text-2xl font-black text-violet-300">
              {formatCurrency(inventorySummary.grossProfit)}
            </p>
            <div className="mt-3 space-y-1 text-xs text-slate-300">
              <p>
                Margen bruto: <span className="font-bold text-violet-200">{inventorySummary.grossMarginPercent.toFixed(1)}%</span>
              </p>
              <p>
                Markup sobre costo: <span className="font-bold text-emerald-300">{inventorySummary.markupPercent.toFixed(1)}%</span>
              </p>
              {inventorySummary.markupExcessPercent > 0 && (
                <p>
                  Exceso sobre 100%: <span className="font-bold text-amber-300">{inventorySummary.markupExcessPercent.toFixed(1)}%</span> / <span className="font-bold text-amber-300">{formatCurrency(inventorySummary.markupExcessValue)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto, categoría o detalle..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr] xl:items-start">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Catálogo</h2>
              <span className="text-sm text-slate-400">
                {search.trim() ? `${filteredProducts.length} resultados` : "Vista rápida"}
              </span>
            </div>
            <ProductGrid products={filteredProducts} onAdd={handleAddToCart} onAddStock={handleAddStock} />
          </section>

          {hasCartItems && !isCartOpen && (
            <CartPanel
              cart={cart}
              products={productCatalog}
              onChangeQuantity={handleChangeQuantity}
              onChangePrice={handleChangePrice}
              onRemove={handleRemove}
              onCheckout={handleCheckout}
              onOpen={() => setIsCartOpen(true)}
              subtotal={totals.subtotal}
              tax={totals.tax}
              total={totals.total}
            />
          )}
        </div>

        {hasCartItems && isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl">
              <CartPanel
                cart={cart}
                products={productCatalog}
                onChangeQuantity={handleChangeQuantity}
                onChangePrice={handleChangePrice}
                onRemove={handleRemove}
                onCheckout={handleCheckout}
                onClose={() => setIsCartOpen(false)}
                subtotal={totals.subtotal}
                tax={totals.tax}
                total={totals.total}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
