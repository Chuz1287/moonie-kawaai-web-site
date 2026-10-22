"use client";

import { useState } from "react";
import type { SaleActionsProps } from "./SaleActions.logic";
import styles from "./SaleActions.module.scss";

export default function SaleActions({
  sale,
  disabled = false,
  onEdit,
  onDelete,
}: SaleActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`${styles.scope} gap-2`}>
      {onEdit && (
        <button
          onClick={onEdit}
          disabled={disabled}
          className={styles.editBtn}
          title="Editar venta"
        >
          Editar
        </button>
      )}
      {onDelete && (
        <button
          onClick={handleDelete}
          disabled={disabled || isDeleting}
          className={styles.deleteBtn}
          title="Eliminar venta"
        >
          {isDeleting ? "Eliminando..." : "Eliminar"}
        </button>
      )}
    </div>
  );
}

