"use client";

import { formatPosCurrency, type PosDashboardModel } from "../dashboard.logic";

const expenseCategories = ["Stand / piso", "Comida", "Sueldos", "Caseta", "Gasolina"];

export default function EventManagementDialog({ model }: { model: PosDashboardModel }) {
  if (!model.isEventModalOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !model.isSavingEvent) {
          model.setIsEventModalOpen(false);
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
          <h2 id="create-event-title" className="text-xl font-black text-white">
            Crear evento
          </h2>
          <button
            type="button"
            onClick={() => model.setIsEventModalOpen(false)}
            disabled={model.isSavingEvent || model.isSavingExpense}
            aria-label="Cerrar modal"
            className="rounded-lg border border-slate-700 px-3 py-1 text-lg text-slate-300 hover:text-white"
          >
            ×
          </button>
        </div>

        {model.eventModalStatus && (
          <p
            role="status"
            className="mb-4 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
          >
            {model.eventModalStatus}
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void model.handleSaveChannel();
          }}
          className="space-y-4"
        >
          <label className="block text-sm font-semibold text-slate-300">
            Nombre del evento
            <input
              required
              autoFocus
              value={model.eventName}
              onChange={(event) => model.setEventName(event.target.value)}
              placeholder="Convención, bazar..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-500"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-300">
            Lugar
            <input
              value={model.eventLocation}
              onChange={(event) => model.setEventLocation(event.target.value)}
              placeholder="Recinto o ciudad"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-500"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-300">
              Fecha de inicio
              <input
                required
                type="date"
                value={model.eventStartDate}
                max={model.eventEndDate || undefined}
                onChange={(event) => model.setEventStartDate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-500"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-300">
              Fecha de fin
              <input
                required
                type="date"
                value={model.eventEndDate}
                min={model.eventStartDate || undefined}
                onChange={(event) => model.setEventEndDate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-500"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={
              model.isSavingEvent ||
              !model.eventName.trim() ||
              !model.eventStartDate ||
              !model.eventEndDate
            }
            className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {model.isSavingEvent ? "Guardando..." : "Crear y activar evento"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <h3 className="mb-3 text-sm font-bold text-slate-200">Eventos existentes</h3>
          {model.salesChannels.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay eventos.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {model.salesChannels.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    {model.editingEventId === event.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`event-name-${event.id}`}>
                          Nombre de {event.name}
                        </label>
                        <input
                          id={`event-name-${event.id}`}
                          value={model.editingEventName}
                          onChange={(inputEvent) =>
                            model.setEditingEventName(inputEvent.target.value)
                          }
                          className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm font-semibold text-white"
                        />
                        <button
                          type="button"
                          onClick={() => void model.handleRenameEvent(event)}
                          disabled={!model.editingEventName.trim() || model.editingEventName.trim() === event.name}
                          className="rounded-lg border border-emerald-500/40 px-2 py-1 text-xs font-bold text-emerald-200 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => model.setEditingEventId("")}
                          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <p className="truncate text-sm font-semibold text-white">{event.name}</p>
                    )}
                    <p className="truncate text-xs text-slate-400">
                      {event.location || "Lugar sin especificar"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {model.editingEventId !== event.id && (
                      <button
                        type="button"
                        onClick={() => {
                          model.setEditingEventId(event.id);
                          model.setEditingEventName(event.name);
                        }}
                        className="rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-bold text-sky-200 hover:border-sky-400"
                      >
                        Renombrar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => model.setManagedEventId(event.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                        model.managedEventId === event.id
                          ? "border-violet-400 bg-violet-500/15 text-violet-100"
                          : "border-slate-700 text-slate-300 hover:border-violet-400"
                      }`}
                    >
                      Gastos
                    </button>
                    <button
                      type="button"
                      onClick={() => void model.handleDeleteEvent(event)}
                      disabled={Boolean(model.deletingEventId)}
                      className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      {model.deletingEventId === event.id ? "Borrando..." : "Borrar"}
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
                value={model.managedEventId}
                onChange={(event) => {
                  model.setManagedEventId(event.target.value);
                  model.setEditingExpenseId("");
                  model.setEditingExpenseAmount("");
                }}
                disabled={model.salesChannels.length === 0}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="">Selecciona un evento</option>
                {model.salesChannels.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-lg font-black text-rose-300">
              {formatPosCurrency(model.totalEventExpenses)}
            </p>
          </div>

          {model.managedEventId ? (
            <>
              <form
                onSubmit={model.handleSaveEventExpense}
                className="grid gap-3 md:grid-cols-2"
              >
                <label className="text-sm text-slate-300">
                  Categoría
                  <select
                    value={model.expenseCategory}
                    onChange={(event) => model.setExpenseCategory(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                    <option value="__custom__">Nueva categoría...</option>
                  </select>
                </label>
                {model.expenseCategory === "__custom__" && (
                  <label className="text-sm text-slate-300">
                    Nueva categoría
                    <input
                      required
                      value={model.customExpenseCategory}
                      onChange={(event) =>
                        model.setCustomExpenseCategory(event.target.value)
                      }
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
                    value={model.expenseAmount}
                    onChange={(event) => model.setExpenseAmount(event.target.value)}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={model.isSavingExpense}
                  className="self-end rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {model.isSavingExpense ? "Guardando..." : "Agregar gasto"}
                </button>
              </form>

              <div className="mt-4 max-h-48 divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-800">
                {model.eventExpenses.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-400">
                    Este evento todavía no tiene gastos.
                  </p>
                ) : (
                  model.eventExpenses.map((expense) => (
                    <article
                      key={expense.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {expense.category}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(expense.created_at).toLocaleDateString("es-MX")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {model.editingExpenseId === expense.id ? (
                          <>
                            <label
                              className="sr-only"
                              htmlFor={`event-expense-amount-${expense.id}`}
                            >
                              Importe de {expense.category}
                            </label>
                            <input
                              id={`event-expense-amount-${expense.id}`}
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={model.editingExpenseAmount}
                              onChange={(inputEvent) =>
                                model.setEditingExpenseAmount(inputEvent.target.value)
                              }
                              className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm text-white"
                            />
                            <button
                              type="button"
                              onClick={() => void model.handleUpdateEventExpense(expense)}
                              disabled={model.isUpdatingExpense || !model.editingExpenseAmount}
                              className="rounded-lg border border-emerald-500/40 px-2 py-1 text-xs font-bold text-emerald-200 disabled:opacity-50"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                model.setEditingExpenseId("");
                                model.setEditingExpenseAmount("");
                              }}
                              disabled={model.isUpdatingExpense}
                              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <strong className="shrink-0 text-sm text-rose-300">
                              {formatPosCurrency(Number(expense.amount))}
                            </strong>
                            <button
                              type="button"
                              onClick={() => {
                                model.setEditingExpenseId(expense.id);
                                model.setEditingExpenseAmount(String(expense.amount));
                              }}
                              className="rounded-lg border border-sky-500/40 px-2 py-1 text-xs font-bold text-sky-200"
                            >
                              Editar importe
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))
                )}
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
  );
}
