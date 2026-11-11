"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import styles from "./ProductOptionsManager.module.scss";

type OptionType = "category" | "series";

type ProductOptions = {
  categories: string[];
  series: string[];
};

type ProductOptionsManagerProps = {
  onOptionsChanged: () => Promise<void>;
};

async function sendOptionRequest(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, string>
) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(result.message ?? "No se pudo guardar la opción.");
  }
}

export default function ProductOptionsManager({
  onOptionsChanged,
}: ProductOptionsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ProductOptions>({ categories: [], series: [] });
  const [type, setType] = useState<OptionType>("category");
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editedName, setEditedName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadOptions = async () => {
    const response = await fetch("/api/product-options", { cache: "no-store" });
    const result = (await response.json()) as ProductOptions & { message?: string };
    if (!response.ok) throw new Error(result.message ?? "No se pudieron cargar las opciones.");
    setOptions(result);
  };

  const openManager = async () => {
    setIsOpen(true);
    setError("");
    setLoading(true);
    try {
      await loadOptions();
      await onOptionsChanged();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar opciones.");
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try {
      await action();
      await loadOptions();
      await onOptionsChanged();
      setNewName("");
      setEditingName("");
      setEditedName("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo completar la operación.");
    } finally {
      setLoading(false);
    }
  };

  const currentOptions = type === "category" ? options.categories : options.series;
  const label = type === "category" ? "categoría" : "serie";

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => void openManager()}>
        <Tags size={18} />
        Administrar categorías y series
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={() => !loading && setIsOpen(false)}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-options-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.header}>
              <h2 id="product-options-title">Categorías y series</h2>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </header>

            <div className={styles.tabs} role="tablist" aria-label="Tipo de opción">
              <button
                type="button"
                role="tab"
                aria-selected={type === "category"}
                className={type === "category" ? styles.activeTab : ""}
                onClick={() => {
                  setType("category");
                  setEditingName("");
                }}
              >
                Categorías
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={type === "series"}
                className={type === "series" ? styles.activeTab : ""}
                onClick={() => {
                  setType("series");
                  setEditingName("");
                }}
              >
                Series
              </button>
            </div>

            <form
              className={styles.addForm}
              onSubmit={(event) => {
                event.preventDefault();
                const name = newName.trim();
                if (!name) return;
                void runAction(async () => {
                  await sendOptionRequest("/api/product-options", "POST", { type, name });
                });
              }}
            >
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={`Nueva ${label}`}
                aria-label={`Nueva ${label}`}
                disabled={loading}
              />
              <button type="submit" className={styles.primaryButton} disabled={loading || !newName.trim()}>
                <Plus size={18} />
                Agregar
              </button>
            </form>

            {error && <p className={styles.error} role="alert">{error}</p>}
            {loading && currentOptions.length === 0 ? (
              <p className={styles.emptyState}>Cargando opciones...</p>
            ) : currentOptions.length > 0 ? (
              <ul className={styles.optionList}>
                {currentOptions.map((option) => (
                  <li key={option} className={styles.optionItem}>
                    {editingName === option ? (
                      <form
                        className={styles.editForm}
                        onSubmit={(event) => {
                          event.preventDefault();
                          const nextName = editedName.trim();
                          if (!nextName) return;
                          void runAction(async () => {
                            await sendOptionRequest(`/api/product-options/${type}`, "PATCH", {
                              oldName: option,
                              newName: nextName,
                            });
                          });
                        }}
                      >
                        <input
                          autoFocus
                          value={editedName}
                          onChange={(event) => setEditedName(event.target.value)}
                          aria-label={`Nuevo nombre para ${option}`}
                          disabled={loading}
                        />
                        <button type="submit" aria-label="Guardar" disabled={loading || !editedName.trim()}>
                          <Check size={18} />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancelar"
                          onClick={() => setEditingName("")}
                          disabled={loading}
                        >
                          <X size={18} />
                        </button>
                      </form>
                    ) : (
                      <>
                        <span>{option}</span>
                        <div className={styles.optionActions}>
                          <button
                            type="button"
                            aria-label={`Editar ${option}`}
                            title={`Editar ${option}`}
                            disabled={loading}
                            onClick={() => {
                              setEditingName(option);
                              setEditedName(option);
                            }}
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            type="button"
                            className={styles.deleteButton}
                            aria-label={`Borrar ${option}`}
                            title={`Borrar ${option}`}
                            disabled={loading}
                            onClick={() => {
                              if (!window.confirm(`¿Borrar la ${label} "${option}"?`)) return;
                              void runAction(async () => {
                                await sendOptionRequest(
                                  `/api/product-options/${type}?name=${encodeURIComponent(option)}`,
                                  "DELETE"
                                );
                              });
                            }}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>Todavía no hay opciones registradas.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
