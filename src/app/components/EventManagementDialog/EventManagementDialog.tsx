"use client";

import { formatPosCurrency, type PosDashboardModel } from "@/pages/pos/pos.logic";
import styles from "./EventManagementDialog.module.scss";

const expenseCategories = ["Stand / piso", "Comida", "Sueldos", "Caseta", "Gasolina"];

export default function EventManagementDialog({ model }: { model: PosDashboardModel }) {
  if (!model.isEventModalOpen) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
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
        className={styles.dialog}
      >
        <div className={styles.header}>
          <h2 id="create-event-title" className={styles.title}>
            Crear evento
          </h2>
          <button
            type="button"
            onClick={() => model.setIsEventModalOpen(false)}
            disabled={model.isSavingEvent || model.isSavingExpense}
            aria-label="Cerrar modal"
            className={styles.closeButton}
          >
            ×
          </button>
        </div>

        {model.eventModalStatus && (
          <p role="status" className={styles.status}>
            {model.eventModalStatus}
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void model.handleSaveChannel();
          }}
          className={styles.form}
        >
          <label className={styles.label}>
            Nombre del evento
            <input
              required
              autoFocus
              value={model.eventName}
              onChange={(event) => model.setEventName(event.target.value)}
              placeholder="Convención, bazar..."
              className={styles.input}
            />
          </label>
          <label className={styles.label}>
            Lugar
            <input
              value={model.eventLocation}
              onChange={(event) => model.setEventLocation(event.target.value)}
              placeholder="Recinto o ciudad"
              className={styles.input}
            />
          </label>
          <div className={styles.dateRow}>
            <label className={`${styles.label} ${styles.dateCol}`}>
              Fecha de inicio
              <input
                required
                type="date"
                value={model.eventStartDate}
                max={model.eventEndDate || undefined}
                onChange={(event) => model.setEventStartDate(event.target.value)}
                className={styles.input}
              />
            </label>
            <label className={`${styles.label} ${styles.dateCol}`}>
              Fecha de fin
              <input
                required
                type="date"
                value={model.eventEndDate}
                min={model.eventStartDate || undefined}
                onChange={(event) => model.setEventEndDate(event.target.value)}
                className={styles.input}
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
            className={styles.submitButton}
          >
            {model.isSavingEvent ? "Guardando..." : "Crear y activar evento"}
          </button>
        </form>

        <div className={styles.expensesSection}>
          <h3 className={styles.expensesTitle}>Eventos existentes</h3>
          {model.salesChannels.length === 0 ? (
            <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>Aún no hay eventos.</p>
          ) : (
            <ul style={{ borderTop: "1px solid var(--border-color)" }}>
              {model.salesChannels.map((event) => (
                <li
                  key={event.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.75rem 0",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    {model.editingEventId === event.id ? (
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                        <label className="sr-only" htmlFor={`event-name-${event.id}`}>
                          Nombre de {event.name}
                        </label>
                        <input
                          id={`event-name-${event.id}`}
                          value={model.editingEventName}
                          onChange={(inputEvent) =>
                            model.setEditingEventName(inputEvent.target.value)
                          }
                          className={styles.input}
                          style={{ minWidth: 0, flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => void model.handleRenameEvent(event)}
                          disabled={!model.editingEventName.trim() || model.editingEventName.trim() === event.name}
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.5rem",
                            border: "1px solid var(--accent-success)",
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "var(--accent-success)",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 200ms ease",
                          }}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => model.setEditingEventId("")}
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.5rem",
                            border: "1px solid var(--border-color)",
                            background: "transparent",
                            color: "var(--text-secondary)",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {event.name}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {event.location || "Lugar sin especificar"}
                        </p>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    {model.editingEventId !== event.id && (
                      <button
                        type="button"
                        onClick={() => {
                          model.setEditingEventId(event.id);
                          model.setEditingEventName(event.name);
                        }}
                        style={{
                          padding: "0.375rem 0.75rem",
                          borderRadius: "0.5rem",
                          border: "1px solid rgba(59, 130, 246, 0.4)",
                          background: "transparent",
                          color: "rgba(191, 219, 254, 1)",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          transition: "all 200ms ease",
                        }}
                      >
                        Renombrar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => model.setManagedEventId(event.id)}
                      style={{
                        padding: "0.375rem 0.75rem",
                        borderRadius: "0.5rem",
                        border: model.managedEventId === event.id ? "1px solid var(--accent-primary)" : "1px solid var(--border-color)",
                        background: model.managedEventId === event.id ? "rgba(139, 92, 246, 0.15)" : "transparent",
                        color: model.managedEventId === event.id ? "var(--accent-primary)" : "var(--text-secondary)",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 200ms ease",
                      }}
                    >
                      Gastos
                    </button>
                    <button
                      type="button"
                      onClick={() => void model.handleDeleteEvent(event)}
                      disabled={Boolean(model.deletingEventId)}
                      style={{
                        padding: "0.375rem 0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        background: "transparent",
                        color: "var(--accent-error)",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        opacity: model.deletingEventId ? 0.5 : 1,
                        transition: "all 200ms ease",
                      }}
                    >
                      {model.deletingEventId === event.id ? "Borrando..." : "Borrar"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section className={styles.expensesSection}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1rem" }}>
            <label className={styles.label} style={{ flex: 1, minWidth: "220px" }}>
              Administrar gastos de
              <select
                value={model.managedEventId}
                onChange={(event) => {
                  model.setManagedEventId(event.target.value);
                  model.setEditingExpenseId("");
                  model.setEditingExpenseAmount("");
                }}
                disabled={model.salesChannels.length === 0}
                className={styles.expenseSelect}
              >
                <option value="">Selecciona un evento</option>
                {model.salesChannels.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            <p style={{ fontSize: "1.125rem", fontWeight: "900", color: "var(--accent-error)" }}>
              {formatPosCurrency(model.totalEventExpenses)}
            </p>
          </div>

          {model.managedEventId ? (
            <>
              <form
                onSubmit={model.handleSaveEventExpense}
                style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}
              >
                <label className={styles.label} style={{ flex: 1 }}>
                  Categoría
                  <select
                    value={model.expenseCategory}
                    onChange={(event) => model.setExpenseCategory(event.target.value)}
                    className={styles.expenseSelect}
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
                  <label className={styles.label} style={{ flex: 1 }}>
                    Nueva categoría
                    <input
                      required
                      value={model.customExpenseCategory}
                      onChange={(event) =>
                        model.setCustomExpenseCategory(event.target.value)
                      }
                      placeholder="Ej. hospedaje"
                      className={styles.input}
                    />
                  </label>
                )}
                <label className={styles.label} style={{ flex: 1 }}>
                  Importe
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={model.expenseAmount}
                    onChange={(event) => model.setExpenseAmount(event.target.value)}
                    placeholder="0.00"
                    className={styles.input}
                  />
                </label>
                <button
                  type="submit"
                  disabled={model.isSavingExpense}
                  style={{
                    alignSelf: "flex-end",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    background: "var(--accent-error)",
                    color: "white",
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    opacity: model.isSavingExpense ? 0.5 : 1,
                    transition: "all 200ms ease",
                  }}
                >
                  {model.isSavingExpense ? "Guardando..." : "Agregar gasto"}
                </button>
              </form>

              <div
                style={{
                  marginTop: "1rem",
                  maxHeight: "12rem",
                  overflowY: "auto",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-color)",
                  borderTop: "none",
                }}
              >
                {model.eventExpenses.length === 0 ? (
                  <p style={{ padding: "1rem", textAlign: "center", fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
                    Este evento todavía no tiene gastos.
                  </p>
                ) : (
                  model.eventExpenses.map((expense, index) => (
                    <article
                      key={expense.id}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        padding: "1rem",
                        borderBottom: index < model.eventExpenses.length - 1 ? "1px solid var(--border-color)" : "none",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        {model.editingExpenseId === expense.id ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end" }}>
                            <label className={styles.label} style={{ flex: 1, minWidth: "150px" }}>
                              Categoría
                              <select
                                value={model.editingExpenseCategory}
                                onChange={(e) => model.setEditingExpenseCategory(e.target.value)}
                                className={styles.expenseSelect}
                              >
                                {[...expenseCategories, expense.category].filter((v, i, a) => a.indexOf(v) === i).map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className={styles.label} style={{ flex: 0.5, minWidth: "100px" }}>
                              Importe
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={model.editingExpenseAmount}
                                onChange={(e) => model.setEditingExpenseAmount(e.target.value)}
                                className={styles.input}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => void model.handleSaveExpense(expense)}
                              disabled={!model.editingExpenseAmount || Number(model.editingExpenseAmount) <= 0}
                              style={{
                                padding: "0.25rem 0.5rem",
                                borderRadius: "0.375rem",
                                border: "1px solid var(--accent-success)",
                                background: "rgba(16, 185, 129, 0.1)",
                                color: "var(--accent-success)",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                cursor: "pointer",
                                opacity: !model.editingExpenseAmount || Number(model.editingExpenseAmount) <= 0 ? 0.5 : 1,
                              }}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                model.setEditingExpenseId("");
                                model.setEditingExpenseAmount("");
                                model.setEditingExpenseCategory("");
                              }}
                              style={{
                                padding: "0.25rem 0.5rem",
                                borderRadius: "0.375rem",
                                border: "1px solid var(--border-color)",
                                background: "transparent",
                                color: "var(--text-secondary)",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <p style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {expense.category}
                            </p>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{expense.notes}</p>
                          </>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                        {model.editingExpenseId !== expense.id && (
                          <button
                            type="button"
                            onClick={() => {
                              model.setEditingExpenseId(expense.id);
                              model.setEditingExpenseAmount(String(expense.amount));
                              model.setEditingExpenseCategory(expense.category);
                            }}
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.375rem",
                              border: "1px solid rgba(59, 130, 246, 0.4)",
                              background: "transparent",
                              color: "rgba(191, 219, 254, 1)",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            Editar
                          </button>
                        )}
                        <p style={{ fontSize: "0.875rem", fontWeight: "900", color: "var(--accent-error)" }}>
                          {formatPosCurrency(expense.amount)}
                        </p>
                        <button
                          type="button"
                          onClick={() => void model.handleDeleteEventExpense(expense)}
                          disabled={Boolean(model.editingExpenseId)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.375rem",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            background: "transparent",
                            color: "var(--accent-error)",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            opacity: model.editingExpenseId === expense.id ? 0.5 : 1,
                          }}
                        >
                          {model.editingExpenseId === expense.id ? "Borrando..." : "Borrar"}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          ) : (
            <p style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", textAlign: "center", padding: "1.5rem" }}>
              Selecciona un evento para administrar sus gastos.
            </p>
          )}
        </section>
      </section>
    </div>
  );
}
