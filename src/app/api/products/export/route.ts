import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const pageSize = 1000;

function toCellValue(value: unknown): string | number | boolean | Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return value;
  }

  return JSON.stringify(value);
}

export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { message: "Supabase no está configurado." },
      { status: 500 }
    );
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const products: Record<string, unknown>[] = [];

    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client
        .from("products")
        .select("*")
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
      }

      const page = (data ?? []) as Record<string, unknown>[];
      products.push(...page);

      if (page.length < pageSize) {
        break;
      }
    }

    if (products.length === 0) {
      return NextResponse.json(
        { message: "No hay productos en Supabase para exportar." },
        { status: 404 }
      );
    }

    const headers = [...new Set(products.flatMap((product) => Object.keys(product)))];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Productos");

    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(Math.max(header.length + 2, 14), 36),
    }));
    worksheet.addRows(
      products.map((product) => headers.map((header) => toCellValue(product[header])))
    );
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: products.length + 1, column: headers.length },
    };
    worksheet.getRow(1).font = { bold: true };

    const file = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="catalogo-productos-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudo generar el Excel del catálogo.",
      },
      { status: 500 }
    );
  }
}
