"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./EventsAndExpensesModal.module.scss";

type EventRecord = {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
};

type ExpenseRecord = {
  id: string;
  event_id: string;
  category: string;
  description: string | null;
  amount: number;
  created_at: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type SectionKey = "create" | "manage" | "expense" | "list";

const SELECTED_EVENT_KEY = "moonie_kawaai_selected_event";
const OTHER_CATEGORY = "Otra";
const expenseCategories = ["Stand/piso", "Comida", "Sueldos", "Cuota de caseta", "Gasolina", OTHER_CATEGORY];

const currencyFormatter = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "La operación no se pudo completar.");
  }

  return data;
}

function sendJson(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function upsertEvent(list: EventRecord[], event: EventRecord) {
  return list.some((item) => item.id === event.id)
    ? list.map((item) => (item.id === event.id ? event : item))
    : [...list, event];
}

export default function EventsAndExpensesModal({ isOpen, onClose }: Props) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [openSection, setOpenSection] = useState<SectionKey | null>("expense");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const [expenseCategory, setExpenseCategory] = useState(expenseCategories[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const visibleExpenses = expenses.filter((expense) => expense.event_id === selectedEventId);
  const totalExpenses = visibleExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    requestJson<{ events: EventRecord[] }>("/api/events")
      .then((data) => {
        if (cancelled) return;
        const stored = window.localStorage.getItem(SELECTED_EVENT_KEY);
        setEvents(data.events);
        setSelectedEventId(
          (current) => current || data.events.find((item) => item.id === stored)?.id || data.events[0]?.id || ""
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus(getErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (selectedEventId) {
      window.localStorage.setItem(SELECTED_EVENT_KEY, selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (!isOpen || !selectedEventId) return;

    let cancelled = false;

    requestJson<{ expenses: ExpenseRecord[] }>(`/api/events/${encodeURIComponent(selectedEventId)}/expenses`)
      .then((data) => {
        if (!cancelled) setExpenses(data.expenses);
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus(getErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedEventId]);

  useEffect(() => {
    setEditName(selectedEvent?.name ?? "");
    setEditStartDate(selectedEvent?.start_date ?? "");
    setEditEndDate(selectedEvent?.end_date ?? "");
  }, [selectedEvent]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function runAction(action: () => Promise<string | void>) {
    setIsSaving(true);
    setStatus("");

    try {
      const message = await action();
      if (message) setStatus(message);
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  function handleCreateEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    void runAction(async () => {
      const data = await requestJson<{ event: EventRecord }>(
        "/api/events",
        sendJson("POST", {
          name: newName,
          location: newLocation,
          start_date: newStartDate,
          end_date: newEndDate,
        })
      );

      setEvents((current) => upsertEvent(current, data.event));
      setSelectedEventId(data.event.id);
      setNewName("");
      setNewLocation("");
      setNewStartDate("");
      setNewEndDate("");
      return "Evento creado y seleccionado.";
    });
  }

  function handleSaveEventDetails(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!selectedEvent) return;

    const eventId = selectedEvent.id;

    void runAction(async () => {
      const data = await requestJson<{ event: EventRecord; message?: string }>(
        `/api/events/${encodeURIComponent(eventId)}`,
        sendJson("PATCH", { name: editName, start_date: editStartDate, end_date: editEndDate })
      );

      setEvents((current) => upsertEvent(current, data.event));
      return data.message ?? "Evento actualizado.";
    });
  }

  function handleToggleStatus() {
    if (!selectedEvent) return;

    const eventId = selectedEvent.id;
    const nextActive = !selectedEvent.is_active;

    void runAction(async () => {
      const data = await requestJson<{ event: EventRecord; message?: string }>(
        `/api/events/${encodeURIComponent(eventId)}`,
        sendJson("PATCH", { is_active: nextActive })
      );

      setEvents((current) => upsertEvent(current, data.event));
      return data.message ?? (nextActive ? "Evento reactivado." : "Evento cerrado.");
    });
  }

  function handleDeleteEvent() {
    if (!selectedEvent) return;
    if (!window.confirm(`¿Eliminar el evento "${selectedEvent.name}"? Esta acción no se puede deshacer.`)) return;

    const eventId = selectedEvent.id;

    void runAction(async () => {
      await requestJson(`/api/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });

      const remaining = events.filter((item) => item.id !== eventId);
      setEvents(remaining);
      setSelectedEventId(remaining[0]?.id ?? "");
      return "Evento eliminado.";
    });
  }

  function handleCreateExpense(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!selectedEvent) return;

    const category = (expenseCategory === OTHER_CATEGORY ? customCategory : expenseCategory).trim();
    const amount = Number(expenseAmount);

    if (!category) {
      setStatus("Indica la categoría del gasto.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("El importe debe ser mayor que cero.");
      return;
    }

    const eventId = selectedEvent.id;

    void runAction(async () => {
      const data = await requestJson<{ expense: ExpenseRecord }>(
        `/api/events/${encodeURIComponent(eventId)}/expenses`,
        sendJson("POST", { category, description: category, amount })
      );

      setExpenses((current) => [data.expense, ...current]);
      setExpenseAmount("");
      setCustomCategory("");
      return "Gasto registrado.";
    });
  }

  function handleSaveExpenseAmount(expenseId: string) {
    if (!selectedEvent) return;

    const amount = Number(editingAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("El importe debe ser mayor que cero.");
      return;
    }

    const eventId = selectedEvent.id;

    void runAction(async () => {
      const data = await requestJson<{ expense: ExpenseRecord; message?: string }>(
        `/api/events/${encodeURIComponent(eventId)}/expenses`,
        sendJson("PATCH", { expenseId, amount })
      );

      setExpenses((current) => current.map((item) => (item.id === expenseId ? data.expense : item)));
      setEditingExpenseId(null);
      return data.message ?? "Importe actualizado.";
    });
  }

  function toggleSection(key: SectionKey) {
    setOpenSection((current) => (current === key ? null : key));
  }

  function renderSection(key: SectionKey, title: string, content: ReactNode) {
    const isSectionOpen = openSection === key;

    return (
      <div className={styles.accordionItem}>
        <button
          type="button"
          className={styles.accordionHeader}
          onClick={() => toggleSection(key)}
          aria-expanded={isSectionOpen}
        >
          <span className={styles.accordionTitle}>{title}</span>
          <ChevronDown
            className={styles.accordionIcon}
            size={20}
            style={{ transform: isSectionOpen ? "rotate(180deg)" : undefined }}
          />
        </button>
        {isSectionOpen && <div className={styles.accordionContent}>{content}</div>}
      </div>
    );
  }

  const noEventMessage = <p className={styles.noExpenses}>Selecciona o crea un evento.</p>;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="events-expenses-title">
      <div className={styles.modal}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        <div className={styles.header}>
          <p className={styles.subtitle}>Eventos</p>
          <h2 id="events-expenses-title" className={styles.title}>
            Eventos y gastos
          </h2>
          <label className={styles.label}>
            Evento seleccionado
            <select
              className={styles.select}
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              disabled={events.length === 0 || isSaving}
            >
              {events.length === 0 && <option value="">Sin eventos</option>}
              {events.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.is_active ? "" : " (cerrado)"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {status && <p className={styles.statusMessage}>{status}</p>}

        <div className={styles.accordion}>
          {renderSection(
            "create",
            "Crear evento",
            <form className={styles.createEventSection} onSubmit={handleCreateEvent}>
              <label className={styles.fieldLabel}>
                Nombre del evento
                <input
                  className={styles.input}
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  required
                  disabled={isSaving}
                />
              </label>
              <label className={styles.fieldLabel}>
                Ubicación
                <input
                  className={styles.input}
                  value={newLocation}
                  onChange={(event) => setNewLocation(event.target.value)}
                  disabled={isSaving}
                />
              </label>
              <div className={styles.dateRow}>
                <label className={styles.fieldLabel}>
                  Fecha de inicio
                  <input
                    type="date"
                    className={styles.input}
                    value={newStartDate}
                    onChange={(event) => setNewStartDate(event.target.value)}
                    required
                    disabled={isSaving}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Fecha de fin
                  <input
                    type="date"
                    className={styles.input}
                    value={newEndDate}
                    onChange={(event) => setNewEndDate(event.target.value)}
                    required
                    disabled={isSaving}
                  />
                </label>
              </div>
              <button type="submit" className={styles.submitButton} disabled={isSaving}>
                Crear evento
              </button>
            </form>
          )}

          {renderSection(
            "manage",
            "Administrar evento",
            selectedEvent ? (
              <form className={styles.managedEventSection} onSubmit={handleSaveEventDetails}>
                <span className={selectedEvent.is_active ? styles.statusActive : styles.statusInactive}>
                  {selectedEvent.is_active ? "Activo" : "Cerrado"}
                </span>
                <label className={styles.fieldLabel}>
                  Nombre del evento
                  <input
                    className={styles.input}
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    required
                    disabled={isSaving}
                  />
                </label>
                <div className={styles.dateRow}>
                  <label className={styles.fieldLabel}>
                    Fecha de inicio
                    <input
                      type="date"
                      className={styles.input}
                      value={editStartDate}
                      onChange={(event) => setEditStartDate(event.target.value)}
                      disabled={isSaving}
                    />
                  </label>
                  <label className={styles.fieldLabel}>
                    Fecha de fin
                    <input
                      type="date"
                      className={styles.input}
                      value={editEndDate}
                      onChange={(event) => setEditEndDate(event.target.value)}
                      disabled={isSaving}
                    />
                  </label>
                </div>
                <div className={styles.buttonGroup}>
                  <button type="submit" className={styles.submitButton} disabled={isSaving}>
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    className={styles.warningButton}
                    onClick={handleToggleStatus}
                    disabled={isSaving}
                  >
                    {selectedEvent.is_active ? "Cerrar evento" : "Reactivar evento"}
                  </button>
                  <button type="button" className={styles.dangerButton} onClick={handleDeleteEvent} disabled={isSaving}>
                    Eliminar evento
                  </button>
                </div>
              </form>
            ) : (
              noEventMessage
            )
          )}

          {renderSection(
            "expense",
            "Agregar gasto",
            selectedEvent ? (
              <form className={styles.expenseFormSection} onSubmit={handleCreateExpense}>
                <div className={styles.flexWrapEnd}>
                  <label className={styles.fieldLabel}>
                    Categoría
                    <select
                      className={styles.select}
                      value={expenseCategory}
                      onChange={(event) => setExpenseCategory(event.target.value)}
                      disabled={isSaving}
                    >
                      {expenseCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  {expenseCategory === OTHER_CATEGORY && (
                    <label className={styles.fieldLabel}>
                      Categoría personalizada
                      <input
                        className={styles.input}
                        value={customCategory}
                        onChange={(event) => setCustomCategory(event.target.value)}
                        disabled={isSaving}
                      />
                    </label>
                  )}
                  <label className={styles.fieldLabel}>
                    Importe (MXN)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={styles.input}
                      value={expenseAmount}
                      onChange={(event) => setExpenseAmount(event.target.value)}
                      required
                      disabled={isSaving}
                    />
                  </label>
                </div>
                <button type="submit" className={styles.addExpenseButton} disabled={isSaving}>
                  Agregar gasto
                </button>
              </form>
            ) : (
              noEventMessage
            )
          )}

          {renderSection(
            "list",
            "Gastos del evento",
            selectedEvent ? (
              <div className={styles.expensesListSection}>
                <div className={styles.expensesSummary}>
                  <p className={styles.expensesLabel}>Total de gastos</p>
                  <strong className={styles.expensesTotal}>{formatCurrency(totalExpenses)}</strong>
                </div>

                {visibleExpenses.length === 0 ? (
                  <p className={styles.noExpenses}>Sin gastos registrados.</p>
                ) : (
                  <div className={styles.expenseList}>
                    {visibleExpenses.map((expense) => (
                      <div key={expense.id} className={styles.expenseRow}>
                        <div>
                          <p className={styles.expenseCategory}>{expense.category}</p>
                          <p className={styles.expenseDate}>
                            {new Date(expense.created_at).toLocaleDateString("es-MX")}
                          </p>
                        </div>
                        <div className={styles.expenseRowRight}>
                          {editingExpenseId === expense.id ? (
                            <>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={styles.editAmountInput}
                                value={editingAmount}
                                onChange={(event) => setEditingAmount(event.target.value)}
                                aria-label="Nuevo importe"
                              />
                              <button
                                type="button"
                                className={styles.smallButtonSuccess}
                                onClick={() => handleSaveExpenseAmount(expense.id)}
                                disabled={isSaving}
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                className={styles.smallButton}
                                onClick={() => setEditingExpenseId(null)}
                                disabled={isSaving}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <span className={styles.expenseAmountDisplay}>
                                {formatCurrency(Number(expense.amount))}
                              </span>
                              <button
                                type="button"
                                className={styles.smallButtonPrimary}
                                onClick={() => {
                                  setEditingExpenseId(expense.id);
                                  setEditingAmount(String(expense.amount));
                                }}
                                disabled={isSaving}
                              >
                                Editar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              noEventMessage
            )
          )}
        </div>
      </div>
    </div>
  );
}
