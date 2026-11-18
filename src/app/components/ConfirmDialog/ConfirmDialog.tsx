"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import styles from "./ConfirmDialog.module.scss";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>{title}</h2>
        <p id={messageId} className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className={styles.cancelBtn} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={styles.confirmBtn}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
