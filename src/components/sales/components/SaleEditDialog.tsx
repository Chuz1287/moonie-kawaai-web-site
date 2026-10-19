"use client";

import type { SalesHistoryModel } from "../sales.logic";

type SaleEditDialogProps = {
  model: SalesHistoryModel;
};

export default function SaleEditDialog({ model }: SaleEditDialogProps) {
  const { editingSale, draftLines, setDraftLines, setEditingSale } = model;
  if (!editingSale) return null;

  const total = draftLines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  );
  const hasInvalidLine = draftLines.some((line) =>
    !Number.isInteger(line.quantity) ||
    line.quantity <= 0 ||
    !Number.isFinite(line.unitPrice) ||
    line.unitPrice < 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-sale-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
              Editar ticket
            </p>
            <h2 id="edit-sale-title" className="mt-1 text-xl font-black text-white">
              {editingSale.sale_number ?? editingSale.id}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setEditingSale(null)}
            className="rounded-lg px-3 py-1 text-slate-300 hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>

        {model.editError && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            No se guardaron los cambios: {model.editError}
          </p>
        )}

        <div className="space-y-3">
          {draftLines.map((line, index) => (
            <div
              key={`${line.productId}-${index}`}
              className="grid gap-3 rounded-xl border border-slate-800 p-3 sm:grid-cols-[1fr_120px_150px_auto] sm:items-end"
            >
              <div>
                <p className="font-semibold text-white">{line.productName}</p>
                <p className="text-xs text-slate-400">ID {line.productId}</p>
              </div>
              <label className="text-xs text-slate-400">
                Cantidad
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={line.quantity}
                  onChange={(event) =>
                    setDraftLines((current) => current.map((entry, lineIndex) =>
                      lineIndex === index
                        ? { ...entry, quantity: Number(event.target.value) }
                        : entry
                    ))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-slate-400">
                Precio unitario
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) =>
                    setDraftLines((current) => current.map((entry, lineIndex) =>
                      lineIndex === index
                        ? { ...entry, unitPrice: Number(event.target.value) }
                        : entry
                    ))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <button
                type="button"
                disabled={draftLines.length <= 1}
                onClick={() =>
                  setDraftLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
                }
                className="rounded-lg border border-rose-500/40 px-3 py-2 text-xs font-bold text-rose-200 disabled:opacity-40"
              >
                Quitar pieza
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <p className="font-bold text-white">Nuevo total: ${total.toFixed(2)}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditingSale(null)}
              className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void model.handleSaveEdit()}
              disabled={model.savingEdit || !draftLines.length || hasInvalidLine}
              className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {model.savingEdit ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
