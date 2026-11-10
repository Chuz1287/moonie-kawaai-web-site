import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase no está configurado.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(
    (value): value is string => Boolean(value)
  ))].sort((a, b) => a.localeCompare(b, "es-MX"));
}

export async function GET() {
  try {
    const client = getClient();
    const [
      { data: categories, error: categoriesError },
      { data: series, error: seriesError },
      { data: products, error: productsError },
    ] = await Promise.all([
      client.from("product_categories").select("name").order("name"),
      client.from("product_series").select("name").order("name"),
      client.from("products").select("tipo, serie"),
    ]);

    if (categoriesError) throw new Error(categoriesError.message);
    if (seriesError) throw new Error(seriesError.message);
    if (productsError) throw new Error(productsError.message);

    return NextResponse.json({
      categories: uniqueValues([
        ...(categories ?? []).map((option) => option.name),
        ...(products ?? []).map((product) => product.tipo as string | null),
      ]),
      series: uniqueValues([
        ...(series ?? []).map((option) => option.name),
        ...(products ?? []).map((product) => product.serie as string | null),
      ]),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar las opciones.";
    console.error("Product option fetch error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "La solicitud no contiene JSON válido." }, { status: 400 });
  }

  const type = body.type;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if ((type !== "category" && type !== "series") || !name) {
    return NextResponse.json(
      { message: "Indica si es categoría o serie y escribe un nombre." },
      { status: 400 }
    );
  }

  try {
    const client = getClient();
    const table = type === "category" ? "product_categories" : "product_series";
    const { data, error } = await client.from(table).insert({ name }).select("name").single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ message: "Esa opción ya existe." }, { status: 409 });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ option: data.name }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo agregar la opción.";
    console.error("Product option creation error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
