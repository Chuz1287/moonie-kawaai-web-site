"use client";

export type ProductImportMode = "update" | "create";

export type ProductImportSummary = {
  totalRows: number;
  ready: number;
  skippedNoCode: number;
  skippedDuplicateCode: number;
  skippedNotFound: number;
  skippedAlreadyExists: number;
  skippedNoChanges: number;
  skippedConflict: number;
  skippedInvalid: number;
  failed: number;
  succeeded: number;
};

export type ProductImportIssue = {
  row: number;
  code: string;
  reason: string;
};

export type ProductImportResponse = {
  mode: ProductImportMode;
  stage: "preview" | "apply";
  summary: ProductImportSummary;
  issues: ProductImportIssue[];
  issuesTruncated: boolean;
  message?: string;
};

export async function sendProductWorkbook(
  file: File,
  mode: ProductImportMode,
  stage: "preview" | "apply",
  includeStock: boolean
): Promise<ProductImportResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);
  formData.append("stage", stage);
  formData.append("includeStock", String(includeStock));

  const response = await fetch("/api/products/import", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as ProductImportResponse;

  if (!response.ok) {
    throw new Error(payload.message ?? "No se pudo procesar el archivo de productos.");
  }

  return payload;
}
