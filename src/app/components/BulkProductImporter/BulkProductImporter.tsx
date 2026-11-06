"use client";

import { useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import styles from "./BulkProductImporter.module.scss";
import {
  sendProductWorkbook,
  type ProductImportMode,
  type ProductImportResponse,
} from "./BulkProductImporter.logic";

export default function BulkProductImporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ProductImportMode>("update");
  const [includeStock, setIncludeStock] = useState(false);
  const [preview, setPreview] = useState<ProductImportResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 8000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLocaleLowerCase("es-MX").endsWith(".xlsx")) {
      setFile(null);
      setPreview(null);
      setError("Selecciona un archivo Excel con formato .xlsx.");
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setFile(null);
      setPreview(null);
      setError("El archivo Excel no puede pesar más de 15 MB.");
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setError("");
  };

  const handleModeChange = (nextMode: ProductImportMode) => {
    setMode(nextMode);
    setPreview(null);
    setError("");
  };

  const handleIncludeStockChange = (checked: boolean) => {
    setIncludeStock(checked);
    setPreview(null);
    setError("");
  };

  const runImport = async (stage: "preview" | "apply") => {
    if (!file) {
      setError("Selecciona el archivo Excel que vas a importar.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const result = await sendProductWorkbook(file, mode, stage, includeStock);
      setPreview(result);

      if (stage === "apply") {
        if (mode === "update") {
          setToast(
            `Actualización terminada: ${result.summary.succeeded} producto(s) actualizados; ` +
              `${result.summary.skippedNotFound} no encontrados; ` +
              `${result.summary.failed} errores al guardar; ` +
              `${result.summary.skippedNoCode} omitidos sin Código; ` +
              `${result.summary.skippedDuplicateCode + result.summary.skippedConflict} con conflictos de código.`
          );
        } else {
          setToast(
            `Importación terminada: ${result.summary.succeeded} producto(s) creados; ` +
              `${result.summary.failed} errores al guardar; ` +
              `${result.summary.skippedNoCode} omitidos sin Código; ` +
              `${result.summary.skippedAlreadyExists} ya existentes.`
          );
        }
      }
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "No se pudo completar la importación."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const closeDialog = () => {
    if (!isProcessing) {
      setIsOpen(false);
    }
  };

  const isPreview = preview?.stage === "preview";
  const canApply = Boolean(
    isPreview &&
      preview.summary.ready > 0 &&
      preview.summary.skippedNoCode >= 0
  );

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(true)}
      >
        <FileSpreadsheet size={18} />
        Importar productos por Excel
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="bulk-product-import-title"
        onClose={() => setIsOpen(false)}
        onCancel={(event) => {
          if (isProcessing) event.preventDefault();
          else setIsOpen(false);
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeDialog();
        }}
      >
        <section className={styles.modal}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Inventario</p>
              <h2 id="bulk-product-import-title">Importar productos por Excel</h2>
              <p className={styles.description}>
                Usa el Excel exportado desde la base de datos. Las filas sin
                Código se omiten; las celdas vacías no borran datos existentes.
              </p>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeDialog}
              aria-label="Cerrar"
              disabled={isProcessing}
            >
              <X size={20} />
            </button>
          </header>

          <fieldset className={styles.modeFieldset} disabled={isProcessing}>
            <legend>¿Qué operación quieres realizar?</legend>
            <label className={styles.modeOption}>
              <input
                type="radio"
                name="product-import-mode"
                checked={mode === "update"}
                onChange={() => handleModeChange("update")}
              />
              <span>
                <strong>Actualizar existentes</strong>
                <small>
                  Busca por Codigo. En la primera actualización también usa el
                  id del Excel si todavía no había Código guardado.
                </small>
              </span>
            </label>
            <label className={styles.modeOption}>
              <input
                type="radio"
                name="product-import-mode"
                checked={mode === "create"}
                onChange={() => handleModeChange("create")}
              />
              <span>
                <strong>Crear productos nuevos</strong>
                <small>
                  Solo crea códigos que aún no existen en la base de datos.
                </small>
              </span>
            </label>
          </fieldset>

          {mode === "update" ? (
            <label className={styles.stockOption}>
              <input
                type="checkbox"
                checked={includeStock}
                onChange={(event) =>
                  handleIncludeStockChange(event.currentTarget.checked)
                }
                disabled={isProcessing}
              />
              <span>
                <strong>Actualizar también el stock</strong>
                <small>
                  Desactivado por defecto: conserva el stock actual de Supabase.
                  Actívalo para reemplazarlo con el valor del Excel.
                </small>
              </span>
            </label>
          ) : null}

          <div
            className={`${styles.filePicker} ${isDragging ? styles.filePickerDragging : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isProcessing) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (isProcessing) return;

              const droppedFile = event.dataTransfer.files[0];
              if (!droppedFile) {
                setError("No se encontró un archivo en la selección.");
                return;
              }

              selectFile(droppedFile);
            }}
          >
            <FileSpreadsheet size={24} aria-hidden="true" />
            <span>
              <strong>
                {file?.name ?? "Arrastra aquí tu archivo Excel"}
              </strong>
              <small>o busca en tu equipo · Formato .xlsx, hasta 15 MB</small>
            </span>
            <button
              type="button"
              className={styles.browseButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              Buscar archivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => selectFile(event.currentTarget.files?.[0])}
              onClick={(event) => {
                event.currentTarget.value = "";
              }}
              disabled={isProcessing}
            />
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          {preview ? (
            <section className={styles.preview} aria-live="polite">
              <h3>Vista previa</h3>
              <div className={styles.summary}>
                <span>Filas con datos: {preview.summary.totalRows}</span>
                <span>Listas para procesar: {preview.summary.ready}</span>
                <span>
                  Omitidas sin Código: {preview.summary.skippedNoCode}
                </span>
                {preview.summary.skippedDuplicateCode > 0 ? (
                  <span>
                    Códigos repetidos en Excel:{" "}
                    {preview.summary.skippedDuplicateCode}
                  </span>
                ) : null}
                {preview.summary.skippedNotFound > 0 ? (
                  <span>
                    No encontrados (se continúa):{" "}
                    {preview.summary.skippedNotFound}
                  </span>
                ) : null}
                {preview.summary.skippedAlreadyExists > 0 ? (
                  <span>
                    Ya existen: {preview.summary.skippedAlreadyExists}
                  </span>
                ) : null}
                {preview.summary.skippedNoChanges > 0 ? (
                  <span>Sin cambios: {preview.summary.skippedNoChanges}</span>
                ) : null}
                {preview.summary.skippedConflict > 0 ? (
                  <span>
                    Conflictos: {preview.summary.skippedConflict}
                  </span>
                ) : null}
                {preview.summary.skippedInvalid > 0 ? (
                  <span>
                    Datos requeridos faltantes: {preview.summary.skippedInvalid}
                  </span>
                ) : null}
                {preview.stage === "apply" ? (
                  <>
                    <span>Correctos: {preview.summary.succeeded}</span>
                    <span>Errores al guardar: {preview.summary.failed}</span>
                  </>
                ) : null}
              </div>
              {preview.issues.length > 0 ? (
                <ul className={styles.issues}>
                  {preview.issues.map((issue) => (
                    <li key={`${issue.row}-${issue.code}-${issue.reason}`}>
                      Fila {issue.row}
                      {issue.code ? ` (${issue.code})` : ""}: {issue.reason}
                    </li>
                  ))}
                  {preview.issuesTruncated ? (
                    <li>
                      La lista está limitada; revisa los totales para conocer
                      el conteo completo.
                    </li>
                  ) : null}
                </ul>
              ) : null}
              {preview.stage === "apply" ? (
                <p className={styles.appliedMessage} role="status">
                  {mode === "update" ? "Actualización" : "Creación"} terminada.
                  Correctos: {preview.summary.succeeded}; no encontrados:{" "}
                  {preview.summary.skippedNotFound}; errores al guardar:{" "}
                  {preview.summary.failed}; omitidos sin Código:{" "}
                  {preview.summary.skippedNoCode}.
                </p>
              ) : null}
            </section>
          ) : null}

          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={closeDialog}
              disabled={isProcessing}
            >
              Cerrar
            </button>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void runImport("preview")}
                disabled={!file || isProcessing}
              >
                {isProcessing && !isPreview ? "Procesando..." : "Vista previa"}
              </button>
              {canApply ? (
                <button
                  type="button"
                  className={styles.applyButton}
                  onClick={() => void runImport("apply")}
                  disabled={isProcessing}
                >
                  <Upload size={17} />
                  {isProcessing ? "Aplicando..." : "Confirmar importación"}
                </button>
              ) : null}
            </div>
          </footer>
        </section>
      </dialog>

      {toast ? (
        <div className={styles.toast} role="status" aria-live="polite">
          {toast}
          <button
            type="button"
            onClick={() => setToast("")}
            aria-label="Cerrar aviso"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
    </>
  );
}
