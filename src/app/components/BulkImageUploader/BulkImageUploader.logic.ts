"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  CloudinaryUploadError,
  uploadImageToFolder,
} from "@/lib/cloudinary";
import { createCloudinaryImagePath } from "@/lib/cloudinary-upload-path";

export type LocalImageFile = {
  file: File;
  relativePath: string;
};

export type BatchImageStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "duplicate"
  | "error";

export type BatchImageItem = LocalImageFile & {
  id: string;
  status: BatchImageStatus;
  message?: string;
};

const defaultDestination = "moonie-kawaii/products";
const uploadConcurrency = 3;
const supportedImageExtensions = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) {
    return true;
  }

  const extension = file.name.match(/\.[^.]+$/u)?.[0].toLowerCase();
  return extension ? supportedImageExtensions.has(extension) : false;
}

function toBatchItem(entry: LocalImageFile): BatchImageItem {
  return {
    ...entry,
    id: `${entry.relativePath}:${entry.file.size}:${entry.file.lastModified}`,
    status: "pending",
  };
}

function isDuplicateError(error: unknown): boolean {
  if (error instanceof CloudinaryUploadError && error.status === 409) {
    return true;
  }

  return (
    error instanceof Error &&
    /already exists|already taken|public.?id.*exist|duplicate/iu.test(error.message)
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo subir esta imagen.";
}

function readFileEntry(entry: FileSystemFileEntry): Promise<LocalImageFile> {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) =>
        resolve({
          file,
          relativePath: entry.fullPath.replace(/^\/+/u, ""),
        }),
      reject
    );
  });
}

function readDirectoryEntries(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = [];

    const readNextBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(entries);
            return;
          }

          entries.push(...batch);
          readNextBatch();
        },
        reject
      );
    };

    readNextBatch();
  });
}

async function readDroppedEntry(entry: FileSystemEntry): Promise<LocalImageFile[]> {
  if (entry.isFile) {
    return [await readFileEntry(entry as FileSystemFileEntry)];
  }

  if (entry.isDirectory) {
    const directoryEntry = entry as FileSystemDirectoryEntry;
    const children = await readDirectoryEntries(directoryEntry.createReader());
    const nestedFiles = await Promise.all(children.map(readDroppedEntry));
    return nestedFiles.flat();
  }

  return [];
}

export async function getDroppedFiles(
  items: DataTransferItemList,
  fallbackFiles: FileList
): Promise<LocalImageFile[]> {
  const entries = Array.from(items)
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null);

  if (entries.length > 0) {
    const nestedFiles = await Promise.all(entries.map(readDroppedEntry));
    return nestedFiles.flat();
  }

  return Array.from(fallbackFiles).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name,
  }));
}

export function useBulkImageUploader(initialDestination = defaultDestination) {
  const [destinationFolder, setDestinationFolder] = useState(initialDestination);
  const [items, setItems] = useState<BatchImageItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState("");
  const uploadActiveRef = useRef(false);

  const addFiles = useCallback((entries: LocalImageFile[]) => {
    const imageEntries = entries.filter(({ file }) => isImageFile(file));
    const skippedCount = entries.length - imageEntries.length;

    setItems((currentItems) => {
      const currentIds = new Set(currentItems.map((item) => item.id));
      const additions: BatchImageItem[] = [];

      for (const entry of imageEntries) {
        const item = toBatchItem(entry);
        if (!currentIds.has(item.id)) {
          currentIds.add(item.id);
          additions.push(item);
        }
      }

      return [...currentItems, ...additions];
    });

    setSelectionMessage(
      [
        imageEntries.length > 0
          ? `${imageEntries.length} imagen(es) agregada(s) a la lista.`
          : "",
        skippedCount > 0 ? `${skippedCount} archivo(s) no imagen fueron omitidos.` : "",
        entries.length > 0 && imageEntries.length === 0
          ? "No se encontraron archivos de imagen en la selección."
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    );
  }, []);

  const reportSelectionError = useCallback((message: string) => {
    setSelectionMessage(message);
  }, []);

  const uploadPending = useCallback(async (overwriteExisting = false) => {
    const folder = destinationFolder.trim();
    if (!folder) {
      setSelectionMessage("Escribe la carpeta de destino en Cloudinary.");
      return;
    }

    if (uploadActiveRef.current) {
      return;
    }

    const pendingItems = items.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) {
      return;
    }

    uploadActiveRef.current = true;
    setIsUploading(true);
    setSelectionMessage("");
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.status === "pending" ? { ...item, status: "uploading" } : item
      )
    );

    let nextIndex = 0;
    let successfulUploads = 0;
    const worker = async () => {
      while (nextIndex < pendingItems.length) {
        const item = pendingItems[nextIndex];
        nextIndex += 1;

        try {
          const path = createCloudinaryImagePath(folder, item.relativePath);
          await uploadImageToFolder(
            item.file,
            path.assetFolder,
            path.publicId,
            overwriteExisting
          );
          successfulUploads += 1;
          setItems((currentItems) =>
            currentItems.map((currentItem) =>
              currentItem.id === item.id
                ? { ...currentItem, status: "uploaded", message: undefined }
                : currentItem
            )
          );
        } catch (error) {
          const duplicate = isDuplicateError(error);
          setItems((currentItems) =>
            currentItems.map((currentItem) =>
              currentItem.id === item.id
                ? {
                    ...currentItem,
                    status: duplicate ? "duplicate" : "error",
                    message: getErrorMessage(error),
                  }
                : currentItem
            )
          );
        }
      }
    };

    try {
      await Promise.all(
        Array.from(
          { length: Math.min(uploadConcurrency, pendingItems.length) },
          worker
        )
      );
      if (successfulUploads > 0) {
        window.dispatchEvent(new Event("cloudinary-assets-updated"));
      }
    } finally {
      uploadActiveRef.current = false;
      setIsUploading(false);
    }
  }, [destinationFolder, items]);

  const clearItems = useCallback(() => {
    if (!uploadActiveRef.current) {
      setItems([]);
      setSelectionMessage("");
    }
  }, []);

  const retryErrors = useCallback(() => {
    if (!uploadActiveRef.current) {
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.status === "error"
            ? { ...item, status: "pending", message: undefined }
            : item
        )
      );
    }
  }, []);

  const summary = useMemo(
    () =>
      items.reduce(
        (counts, item) => {
          counts[item.status] += 1;
          return counts;
        },
        { pending: 0, uploading: 0, uploaded: 0, duplicate: 0, error: 0 }
      ),
    [items]
  );

  const completedCount = summary.uploaded + summary.duplicate + summary.error;

  return {
    destinationFolder,
    setDestinationFolder,
    items,
    isUploading,
    isDragging,
    setIsDragging,
    selectionMessage,
    addFiles,
    reportSelectionError,
    uploadPending,
    clearItems,
    retryErrors,
    summary,
    completedCount,
  };
}
