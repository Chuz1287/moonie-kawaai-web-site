"use client";

import { useEffect, useRef, useState } from "react";
import { FolderUp, Images, Upload, X } from "lucide-react";
import styles from "./BulkImageUploader.module.scss";
import { getDroppedFiles, useBulkImageUploader } from "./BulkImageUploader.logic";

type BulkImageUploaderProps = {
  initialDestinationFolder?: string;
  stripTopLevelFolder?: boolean;
  showDestinationInput?: boolean;
  triggerLabel?: string;
};

export default function BulkImageUploader({
  initialDestinationFolder,
  stripTopLevelFolder = false,
  showDestinationInput = true,
  triggerLabel = "Subir imágenes por lote",
}: BulkImageUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const model = useBulkImageUploader(initialDestinationFolder);
  const progressValue =
    model.items.length > 0
      ? Math.round((model.completedCount / model.items.length) * 100)
      : 0;

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
    if (folderInputRef.current) {
      folderInputRef.current.webkitdirectory = true;
    }
  }, []);

  const closeDialog = () => {
    if (!model.isUploading) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(true)}
      >
        <Images size={18} />
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="bulk-image-upload-title"
        onClose={() => setIsOpen(false)}
        onCancel={(event) => {
          if (model.isUploading) {
            event.preventDefault();
          } else {
            setIsOpen(false);
          }
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            closeDialog();
          }
        }}
      >
        <section className={styles.modal}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Cloudinary</p>
              <h2 id="bulk-image-upload-title">Subir imágenes por lote</h2>
              <p className={styles.description}>
                Arrastra carpetas o selecciónalas desde tu equipo. Se conservará
                su estructura dentro de la carpeta destino.
              </p>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeDialog}
              aria-label="Cerrar"
              disabled={model.isUploading}
            >
              <X size={20} />
            </button>
          </header>

          {showDestinationInput ? (
            <>
              <label className={styles.fieldLabel} htmlFor="cloudinary-destination">
                Carpeta destino en Cloudinary
              </label>
              <input
                id="cloudinary-destination"
                className={styles.destinationInput}
                value={model.destinationFolder}
                onChange={(event) => model.setDestinationFolder(event.target.value)}
                placeholder="moonie-kawaii/products"
                disabled={model.isUploading}
              />
              <small className={styles.destinationHint}>
                La ruta de destino debe estar dentro de <code>moonie-kawaii/</code>.
              </small>
            </>
          ) : (
            <p className={styles.destinationHint}>
              Destino: <strong>{model.destinationFolder}</strong>
            </p>
          )}

          <div
            className={`${styles.dropzone} ${
              model.isDragging ? styles.dragging : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              model.setIsDragging(true);
            }}
            onDragLeave={() => model.setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              model.setIsDragging(false);
              void getDroppedFiles(
                event.dataTransfer.items,
                event.dataTransfer.files
              )
              .then(model.addFiles)
              .catch((error: unknown) => {
                model.reportSelectionError(
                  error instanceof Error
                    ? error.message
                    : "No se pudieron leer las carpetas seleccionadas."
                );
              });
            }}
          >
            <FolderUp size={32} aria-hidden="true" />
            <strong>Arrastra aquí una o varias carpetas</strong>
            <span>Se incluirán las imágenes y subcarpetas que contengan.</span>
            <button
              type="button"
              className={styles.browseButton}
              onClick={() => folderInputRef.current?.click()}
              disabled={model.isUploading}
            >
              Seleccionar carpeta desde este equipo
            </button>
            <input
              ref={folderInputRef}
              className={styles.hiddenInput}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []).map(
                  (file) => {
                    const relativePath = file.webkitRelativePath || file.name;
                    const relativeSegments = relativePath.split("/");
                    return {
                      file,
                      relativePath:
                        stripTopLevelFolder && relativeSegments.length > 1
                          ? relativeSegments.slice(1).join("/")
                          : relativePath,
                    };
                  }
                );
                model.addFiles(files);
                event.currentTarget.value = "";
              }}
            />
          </div>

          {model.selectionMessage ? (
            <p className={styles.selectionMessage} role="status">
              {model.selectionMessage}
            </p>
          ) : null}

          {model.items.length > 0 ? (
            <section className={styles.queue} aria-label="Progreso de carga">
              <div className={styles.queueHeader}>
                <strong>{model.items.length} imagen(es) en la lista</strong>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={model.clearItems}
                  disabled={model.isUploading}
                >
                  Limpiar lista
                </button>
              </div>

              <progress
                className={styles.progress}
                value={progressValue}
                max={100}
                aria-label={`Carga completada ${progressValue}%`}
              />
              <div className={styles.summary}>
                <span>Subidas: {model.summary.uploaded}</span>
                <span>Duplicadas: {model.summary.duplicate}</span>
                <span>Con error: {model.summary.error}</span>
                {model.summary.pending > 0 ? (
                  <span>Pendientes: {model.summary.pending}</span>
                ) : null}
                {model.summary.uploading > 0 ? (
                  <span>En curso: {model.summary.uploading}</span>
                ) : null}
              </div>

              {model.items.some(
                (item) => item.status === "error" || item.status === "duplicate"
              ) ? (
                <>
                  {model.summary.error > 0 ? (
                    <button
                      type="button"
                      className={styles.retryButton}
                      onClick={model.retryErrors}
                      disabled={model.isUploading}
                    >
                      Reintentar {model.summary.error} error(es)
                    </button>
                  ) : null}
                  <ul className={styles.results}>
                    {model.items
                      .filter(
                        (item) =>
                          item.status === "error" || item.status === "duplicate"
                      )
                      .slice(0, 20)
                      .map((item) => (
                        <li
                          key={item.id}
                          className={
                            item.status === "duplicate"
                              ? styles.duplicate
                              : styles.failed
                          }
                        >
                          <strong>{item.status === "duplicate" ? "Duplicada" : "Error"}</strong>
                          <span>{item.relativePath}</span>
                          {item.message ? <small>{item.message}</small> : null}
                        </li>
                      ))}
                  </ul>
                  {model.summary.error + model.summary.duplicate > 20 ? (
                    <small className={styles.resultsNote}>
                      Se muestran los primeros 20 resultados; los contadores
                      incluyen todos los archivos.
                    </small>
                  ) : null}
                </>
              ) : null}
            </section>
          ) : null}

          <footer className={styles.footer}>
            <span className={styles.driveNote}>
              La integración con Google Drive se agregará después.
            </span>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeDialog}
                disabled={model.isUploading}
              >
                Cerrar
              </button>
              <button
                type="button"
                className={styles.uploadButton}
                onClick={() => void model.uploadPending()}
                disabled={
                  model.isUploading ||
                  model.summary.pending === 0 ||
                  !model.destinationFolder.trim()
                }
              >
                <Upload size={17} />
                {model.isUploading ? "Subiendo..." : "Subir imágenes"}
              </button>
            </div>
          </footer>
        </section>
      </dialog>
    </>
  );
}
