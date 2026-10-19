"use client";

import type { SaleRecord } from "@/services/sales";
import { saleHasStableProductIds } from "../sales.logic";

type SaleActionsProps = {
  sale: SaleRecord;
  busy: boolean;
  onEdit: (sale: SaleRecord) => void;
  onDelete: (sale: SaleRecord) => void;
};

export default function SaleActions({
  sale,
  busy,
  onEdit,
  onDelete,
}: SaleActionsProps) {
  const canEdit = saleHasStableProductIds(sale);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(sale)}
          disabled={busy}
          aria-describedby={!canEdit ? `sale-edit-help-${sale.id}` : undefined}
          className="rounded-md border border-slate-600 px-2 py-1 text-xs font-bold text-slate-200 hover:border-violet-400 disabled:opacity-50"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(sale)}
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
