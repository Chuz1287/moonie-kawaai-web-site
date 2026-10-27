"use client";

import type { SaleEditDialogProps } from "./SaleEditDialog.logic";
import { isDraftLinesValid, getDraftLinesTotal } from "./SaleEditDialog.logic";
import styles from "./SaleEditDialog.module.scss";

export default function SaleEditDialog({ model }: SaleEditDialogProps) {
  if (!model.editingSale) return null;

  const canSave =
    model.draftLines.length > 0 &&
    isDraftLinesValid(model.draftLines) &&
    !model.savingEdit;

  const formatMoney = (value: number) => `$${value.toFixed(2)}`;

  const parseNumberInput = (value: string): number => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const updateLine = (index: number, field: "quantity" | "unitPrice", value: string) => {
    const num = parseNumberInput(value);
    if (num < 0) return;

    const updated = [...model.draftLines];
    if (field === "quantity") {
      updated[index].quantity = Math.floor(num);
    } else {
      updated[index].unitPrice = num;
    }
    model.setDraftLines(updated);
  };

  const removeLine = (index: number) => {
    if (model.draftLines.length > 1) {
      model.setDraftLines(model.draftLines.filter((_, i) => i !== index));
    }
  };

  const close = () => {
    model.setEditingSale(null);
    model.setDraftLines([]);
  };

  const total = getDraftLinesTotal(model.draftLines);

  return (
    <>
      {/* Overlay */}
      <div
        className={styles.overlay}
        onClick={() => !model.savingEdit && close()}
        role="presentation"
      />

      {/* Modal */}
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Editar venta #{model.editingSale.sale_number || model.editingSale.id}</h2>
          <button
            onClick={close}
            disabled={model.savingEdit}
            className={styles.closeBtn}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {model.editError && (
            <div className={styles.error}>{model.editError}</div>
          )}

          <div className={styles.linesContainer}>
            {model.draftLines.map((line, idx) => (
              <div key={idx} className={styles.lineItem}>
                <div className={styles.lineHeader}>
                  <span className={styles.productName}>{line.productName}</span>
                  <button
                    onClick={() => removeLine(idx)}
                    disabled={model.draftLines.length === 1 || model.savingEdit}
                    className={styles.removeBtn}
                  >
                    Eliminar
                  </button>
                </div>

                <div className={styles.lineInputs}>
                  <label>
                    Cantidad:
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity || ""}
                      onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                      disabled={model.savingEdit}
                    />
                  </label>

                  <label>
                    Precio unitario:
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice || ""}
                      onChange={(e) => updateLine(idx, "unitPrice", e.target.value)}
                      disabled={model.savingEdit}
                    />
                  </label>

                  <span className={styles.lineTotal}>
                    {formatMoney(line.quantity * line.unitPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Total:</span>
              <span>{formatMoney(total)}</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            onClick={close}
            disabled={model.savingEdit}
            className={styles.cancelBtn}
          >
            Cancelar
          </button>
          <button
            onClick={() => void model.handleSaveEdit()}
            disabled={!canSave}
            className={styles.saveBtn}
          >
            {model.savingEdit ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </>
  );
}

