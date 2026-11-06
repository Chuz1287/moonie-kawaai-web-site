import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type {
  ProductImportIssue,
  ProductImportMode,
  ProductImportResponse,
  ProductImportSummary,
} from "@/components/BulkProductImporter/BulkProductImporter.logic";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const maxWorkbookBytes = 15 * 1024 * 1024;
const pageSize = 1000;
const writeConcurrency = 5;
const maxIssueDetails = 500;

const importableColumns = new Map<string, string>([
  ["codigo", "Codigo"],
  ["personaje", "personaje"],
  ["serie", "serie"],
  ["tipo", "tipo"],
  ["caja", "caja"],
  ["marca", "marca"],
  ["altura", "Altura"],
  ["stock", "stock"],
  ["costo", "costo"],
  ["precio", "precio"],
  ["precio_tik_tok", "precio_tik_tok"],
  ["precio_ml", "precio_ml"],
  ["titulo_publicaciones", "titulo_publicaciones"],
  ["descripcion", "Descripcion"],
]);

type WorkbookRow = {
  rowNumber: number;
  code: string;
  id: string;
  payload: Record<string, string | number | boolean | null>;
};

type ExistingProduct = {
  id: string | number;
  Codigo: string | null;
};

type PlannedRow = {
  row: WorkbookRow;
  targetId?: string | number;
  issue?: ProductImportIssue;
};

function getCellValue(value: ExcelJS.CellValue): string | number | boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if ("result" in value) {
    return getCellValue(value.result as ExcelJS.CellValue);
  }
  if ("richText" in value) {
    return value.richText.map((item) => item.text).join("");
  }
  if ("text" in value && typeof value.text === "string") {
    return value.text;
  }
  return null;
}

function isBlankValue(value: string | number | boolean | null): boolean {
  return value === null || (typeof value === "string" && value.trim() === "");
}

async function parseWorkbook(file: File): Promise<WorkbookRow[]> {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.from(await file.arrayBuffer());
  await workbook.xlsx.read(Readable.from([buffer]));

  const worksheet =
    workbook.getWorksheet("Productos") ?? workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("El archivo Excel no contiene hojas para importar.");
  }

  const headerRow = worksheet.getRow(1);
  const headers = new Map<number, string>();
  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    const header = String(getCellValue(headerRow.getCell(column).value) ?? "")
      .trim()
      .toLocaleLowerCase("es-MX");
    if (header) headers.set(column, header);
  }

  if (![...headers.values()].includes("codigo")) {
    throw new Error('No se encontró la columna obligatoria "Codigo" en la primera fila.');
  }

  const rows: WorkbookRow[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const sourceRow = worksheet.getRow(rowNumber);
    const hasData = [...headers.keys()].some(
      (column) => !isBlankValue(getCellValue(sourceRow.getCell(column).value))
    );
    if (!hasData) continue;

    const payload: WorkbookRow["payload"] = {};
    let code = "";
    let id = "";

    for (const [column, header] of headers) {
      const cell = sourceRow.getCell(column);
      const value = getCellValue(cell.value);
      if (header === "codigo") {
        code = String(cell.text || value || "").trim();
        if (code) payload.Codigo = code;
        continue;
      }

      if (header === "id") {
        id = String(value ?? "").trim();
        continue;
      }

      const databaseColumn = importableColumns.get(header);
      if (databaseColumn && !isBlankValue(value)) {
        payload[databaseColumn] =
          typeof value === "string" ? value.trim() : value;
      }
    }

    rows.push({ rowNumber, code, id, payload });
  }

  return rows;
}

function buildSummary(): ProductImportSummary {
  return {
    totalRows: 0,
    ready: 0,
    skippedNoCode: 0,
    skippedDuplicateCode: 0,
    skippedNotFound: 0,
    skippedAlreadyExists: 0,
    skippedNoChanges: 0,
    skippedConflict: 0,
    skippedInvalid: 0,
    failed: 0,
    succeeded: 0,
  };
}

function buildPlan(
  rows: WorkbookRow[],
  existingProducts: ExistingProduct[],
  mode: ProductImportMode,
  includeStock: boolean
): { planned: PlannedRow[]; summary: ProductImportSummary; issues: ProductImportIssue[] } {
  const summary = buildSummary();
  const issues: ProductImportIssue[] = [];
  const rowsByCode = new Map<string, ExistingProduct[]>();
  const rowsById = new Map<string, ExistingProduct>();
  const workbookCodeCounts = new Map<string, number>();

  for (const product of existingProducts) {
    rowsById.set(String(product.id), product);
    const code = String(product.Codigo ?? "").trim();
    if (code) rowsByCode.set(code, [...(rowsByCode.get(code) ?? []), product]);
  }
  for (const row of rows) {
    if (row.code) {
      workbookCodeCounts.set(row.code, (workbookCodeCounts.get(row.code) ?? 0) + 1);
    }
  }

  summary.totalRows = rows.length;
  const planned = rows.map<PlannedRow>((row) => {
    if (!row.code) {
      summary.skippedNoCode += 1;
      const issue = { row: row.rowNumber, code: "", reason: "Fila omitida: no tiene Código." };
      issues.push(issue);
      return { row, issue };
    }

    if ((workbookCodeCounts.get(row.code) ?? 0) > 1) {
      summary.skippedDuplicateCode += 1;
      const issue = {
        row: row.rowNumber,
        code: row.code,
        reason: "Código repetido dentro del Excel; se omiten todas sus filas.",
      };
      issues.push(issue);
      return { row, issue };
    }

    const matchesByCode = rowsByCode.get(row.code) ?? [];
    if (mode === "create") {
      if (matchesByCode.length > 0) {
        summary.skippedAlreadyExists += 1;
        const issue = {
          row: row.rowNumber,
          code: row.code,
          reason: "El Código ya existe en la base de datos.",
        };
        issues.push(issue);
        return { row, issue };
      }

      if (
        isBlankValue(row.payload.personaje ?? null) ||
        isBlankValue(row.payload.precio ?? null)
      ) {
        summary.skippedInvalid += 1;
        const issue = {
          row: row.rowNumber,
          code: row.code,
          reason: "Para crear requiere personaje y precio.",
        };
        issues.push(issue);
        return { row, issue };
      }

      summary.ready += 1;
      return { row };
    }

    if (matchesByCode.length > 1) {
      summary.skippedConflict += 1;
      const issue = {
        row: row.rowNumber,
        code: row.code,
        reason: "El Código corresponde a más de un producto en la base de datos.",
      };
      issues.push(issue);
      return { row, issue };
    }

    const codeMatch = matchesByCode[0];
    const idMatch = row.id ? rowsById.get(row.id) : undefined;
    if (codeMatch && idMatch && String(codeMatch.id) !== String(idMatch.id)) {
      summary.skippedConflict += 1;
      const issue = {
        row: row.rowNumber,
        code: row.code,
        reason: "El Código y el id del Excel apuntan a productos diferentes.",
      };
      issues.push(issue);
      return { row, issue };
    }

    const target = codeMatch ?? idMatch;
    if (!target) {
      summary.skippedNotFound += 1;
      const issue = {
        row: row.rowNumber,
        code: row.code,
        reason: "No existe un producto con ese Código o id.",
      };
      issues.push(issue);
      return { row, issue };
    }

    const updates = Object.keys(row.payload).filter(
      (key) => key !== "Codigo" && (includeStock || key !== "stock")
    );
    const codeChanges = String(target.Codigo ?? "").trim() !== row.code;
    if (updates.length === 0 && !codeChanges) {
      summary.skippedNoChanges += 1;
      const issue = {
        row: row.rowNumber,
        code: row.code,
        reason: "No hay campos con datos para actualizar.",
      };
      issues.push(issue);
      return { row, issue };
    }

    summary.ready += 1;
    return { row, targetId: target.id };
  });

  return { planned, summary, issues };
}

async function fetchExistingProducts(): Promise<ExistingProduct[]> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase no está configurado.");
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const products: ExistingProduct[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("products")
      .select("id, Codigo")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      throw new Error(`No se pudo consultar el catálogo: ${error.message}`);
    }

    const page = (data ?? []) as ExistingProduct[];
    products.push(...page);
    if (page.length < pageSize) break;
  }

  return products;
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "La solicitud no contiene un formulario válido." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const mode = formData.get("mode");
  const stage = formData.get("stage");
  const includeStockValue = formData.get("includeStock");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Selecciona un archivo Excel." }, { status: 400 });
  }
  if (!file.name.toLocaleLowerCase("es-MX").endsWith(".xlsx")) {
    return NextResponse.json(
      { message: "El archivo debe ser un libro de Excel .xlsx." },
      { status: 400 }
    );
  }
  if (file.size === 0 || file.size > maxWorkbookBytes) {
    return NextResponse.json(
      { message: "El archivo debe pesar más de 0 y hasta 15 MB." },
      { status: 400 }
    );
  }
  if (mode !== "update" && mode !== "create") {
    return NextResponse.json({ message: "El modo de importación no es válido." }, { status: 400 });
  }
  if (stage !== "preview" && stage !== "apply") {
    return NextResponse.json({ message: "La acción de importación no es válida." }, { status: 400 });
  }
  if (includeStockValue !== "true" && includeStockValue !== "false") {
    return NextResponse.json(
      { message: "Indica si el stock debe incluirse en la importación." },
      { status: 400 }
    );
  }

  try {
    const rows = await parseWorkbook(file);
    const existingProducts = await fetchExistingProducts();
    const includeStock = mode === "update" && includeStockValue === "true";
    const plan = buildPlan(
      rows,
      existingProducts,
      mode as ProductImportMode,
      includeStock
    );

    if (stage === "preview" || plan.summary.ready === 0) {
      const response: ProductImportResponse = {
        mode: mode as ProductImportMode,
        stage: stage as "preview" | "apply",
        summary: plan.summary,
        issues: plan.issues.slice(0, maxIssueDetails),
        issuesTruncated: plan.issues.length > maxIssueDetails,
      };
      return NextResponse.json(response);
    }

    const client = createClient(supabaseUrl!, supabaseKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const tasks = plan.planned.filter((entry) => !entry.issue);
    let nextTask = 0;
    const worker = async () => {
      while (nextTask < tasks.length) {
        const entry = tasks[nextTask];
        nextTask += 1;
        const { row } = entry;

        try {
          if (mode === "update") {
            if (entry.targetId === undefined) {
              throw new Error("No se pudo determinar el producto que se actualizará.");
            }

            const updatePayload = { ...row.payload };
            if (!includeStock) {
              delete updatePayload.stock;
            }

            const { data, error } = await client
              .from("products")
              .update(updatePayload)
              .eq("id", entry.targetId)
              .select("id")
              .maybeSingle();
            if (error) throw new Error(error.message);
            if (!data) throw new Error("No se encontró el producto al aplicar la actualización.");
          } else {
            const { error } = await client.from("products").insert(row.payload);
            if (error) throw new Error(error.message);
          }

          plan.summary.succeeded += 1;
        } catch (error) {
          plan.summary.failed += 1;
          plan.issues.push({
            row: row.rowNumber,
            code: row.code,
            reason: error instanceof Error ? error.message : "Error al guardar el producto.",
          });
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(writeConcurrency, tasks.length) }, worker)
    );

    const response: ProductImportResponse = {
      mode: mode as ProductImportMode,
      stage: "apply",
      summary: plan.summary,
      issues: plan.issues.slice(0, maxIssueDetails),
      issuesTruncated: plan.issues.length > maxIssueDetails,
    };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "No se pudo importar el catálogo.",
      },
      { status: 500 }
    );
  }
}
