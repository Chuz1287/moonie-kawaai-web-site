"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventRecord = {
  id: string;
  name: string;
  location?: string | null;
};

type ExpenseRecord = {
  id: string;
  event_id: string;
  category: string;
  description: string;
  amount: number;
  created_at: string;
};

const expenseCategories = ["Stand / piso", "Comida", "Sueldos", "Caseta", "Gasolina"];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount);

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [category, setCategory] = useState(expenseCategories[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const response = await fetch("/api/events");
        const payload = (await response.json()) as { events?: EventRecord[]; message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "No se pudieron cargar los eventos.");
        }

        if (!cancelled) {
          const loadedEvents = Array.isArray(payload.events) ? payload.events : [];
          setEvents(loadedEvents);
          const savedEvent = localStorage.getItem("moonie_kawaai_selected_event");
          setSelectedEventId(
            loadedEvents.some((event) => event.id === savedEvent)
              ? savedEvent ?? ""
              : loadedEvents[0]?.id ?? ""
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "No se pudieron cargar los eventos.");
        }
      }
    }

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadExpenses() {
      if (!selectedEventId) {
        setExpenses([]);
        return;
      }

      try {
        const response = await fetch(`/api/events/${encodeURIComponent(selectedEventId)}/expenses`);
        const payload = (await response.json()) as { expenses?: ExpenseRecord[]; message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "No se pudieron cargar los gastos.");
        }

        if (!cancelled) {
          setExpenses(Array.isArray(payload.expenses) ? payload.expenses : []);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "No se pudieron cargar los gastos.");
        }
      }
    }

    void loadExpenses();
    return () => {
      cancelled = true;
    };
  }, [selectedEventId]);

  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0),
    [expenses]
  );

  async function handleCreateEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventName.trim() || isSavingEvent) return;

    setIsSavingEvent(true);
    setStatus("");
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: eventName.trim(), location: eventLocation.trim() }),
      });
      const payload = (await response.json()) as { event?: EventRecord; message?: string };

      if (!response.ok || !payload.event) {
        throw new Error(payload.message ?? "No se pudo guardar el evento.");
      }

      setEvents((current) => [
        ...current.filter((event) => event.id !== payload.event!.id),
        payload.event!,
      ]);
      setSelectedEventId(payload.event.id);
      localStorage.setItem("moonie_kawaai_selected_event", payload.event.id);
      setEventName("");
      setEventLocation("");
      setStatus(`Evento activo: ${payload.event.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar el evento.");
    } finally {
      setIsSavingEvent(false);
    }
  }

  async function handleCreateExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expenseCategory = category === "__custom__" ? customCategory.trim() : category;

    if (!selectedEventId || !expenseCategory || isSavingExpense) return;

    setIsSavingExpense(true);
    setStatus("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(selectedEventId)}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expenseCategory,
          amount: Number(amount),
        }),
      });
      const payload = (await response.json()) as { expense?: ExpenseRecord; message?: string };

      if (!response.ok || !payload.expense) {
        throw new Error(payload.message ?? "No se pudo guardar el gasto.");
      }

      setExpenses((current) => [payload.expense!, ...current]);
      setAmount("");
      setCustomCategory("");
      setCategory(expenseCategories[0]);
      setStatus("Gasto registrado.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar el gasto.");
    } finally {
      setIsSavingExpense(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400">Operación</p>
            <h1 className="mt-2 text-3xl font-black text-white">Eventos y gastos</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/sales" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-violet-400">Ventas</Link>
            <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-violet-400">POS</Link>
          </div>
        </header>

        {status && <p role="status" className="mb-5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200">{status}</p>}

        <section className="mb-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={handleCreateEvent} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold text-white">Crear evento</h2>
            <label className="block text-sm text-slate-300">
              Nombre del evento
              <input required value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Convención, bazar..." className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-500" />
            </label>
            <label className="block text-sm text-slate-300">
              Lugar
              <input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} placeholder="Recinto o ciudad" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-500" />
            </label>
            <button disabled={isSavingEvent || !eventName.trim()} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {isSavingEvent ? "Guardando..." : "Crear y activar evento"}
            </button>
          </form>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <label className="block text-sm font-semibold text-slate-300">
              Evento activo
              <select value={selectedEventId} onChange={(event) => {
                setSelectedEventId(event.target.value);
                localStorage.setItem("moonie_kawaai_selected_event", event.target.value);
              }} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                <option value="">Selecciona un evento</option>
                {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
              </select>
            </label>
            {selectedEvent && <p className="mt-3 text-sm text-slate-400">Lugar: {selectedEvent.location || "Sin especificar"}</p>}
            <div className="mt-5 flex items-end justify-between border-t border-slate-800 pt-4">
              <span className="text-sm text-slate-400">Gastos registrados</span>
              <strong className="text-2xl text-rose-300">{formatCurrency(totalExpenses)}</strong>
            </div>
          </section>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={handleCreateExpense} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold text-white">Agregar gasto</h2>
            <label className="block text-sm text-slate-300">
              Categoría
              <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={!selectedEventId} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                {expenseCategories.map((option) => <option key={option} value={option}>{option}</option>)}
                <option value="__custom__">Nueva categoría...</option>
              </select>
            </label>
            {category === "__custom__" && <label className="block text-sm text-slate-300">Nombre de categoría<input required value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} placeholder="Ej. hospedaje" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label>}
            <label className="block text-sm text-slate-300">Importe<input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label>
            <button disabled={!selectedEventId || isSavingExpense} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {isSavingExpense ? "Guardando..." : "Guardar gasto"}
            </button>
          </form>

          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="font-bold text-white">Gastos del evento</h2>
              <span className="text-sm text-slate-400">{expenses.length} registros</span>
            </div>
            {expenses.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">Selecciona un evento y registra sus gastos.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {expenses.map((expense) => (
                  <article key={expense.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="font-semibold text-white">{expense.category}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(expense.created_at).toLocaleDateString("es-MX")}</p>
                    </div>
                    <strong className="text-rose-300">{formatCurrency(Number(expense.amount))}</strong>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}