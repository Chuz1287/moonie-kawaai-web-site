import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mapSupabaseProduct } from "@/services/catalog";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "La solicitud no contiene JSON válido." }, { status: 400 });
  }

  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ message: "El identificador del producto no es válido." }, { status: 400 });
  }

  const code = String(body.code ?? "").trim();
  const name = String(body.name ?? "").trim();
  const series = String(body.series ?? "").trim();
  const category = String(body.category ?? "").trim();
  const caja = String(body.shortDescription ?? "").trim();
  const price = Number(body.price ?? 0);
  const cost = Number(body.cost ?? 0);
  const stock = Number(body.stock ?? 0);

  if (!code || !name || !series || !category) {
    return NextResponse.json(
      { message: "El código, nombre, serie y categoría son obligatorios." },
      { status: 400 }
    );
  }
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(cost) ||
    cost < 0 ||
    !Number.isSafeInteger(stock) ||
    stock < 0
  ) {
    return NextResponse.json(
      { message: "Precio, costo y stock deben ser valores válidos y no negativos." },
      { status: 400 }
    );
  }
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: duplicate, error: lookupError } = await client
      .from("products")
      .select("id")
      .eq("Codigo", code)
      .neq("id", id)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`No se pudo validar el código del producto: ${lookupError.message}`);
    }
    if (duplicate) {
      return NextResponse.json(
        { message: `El código "${code}" ya está registrado.` },
        { status: 409 }
      );
    }

    const { data, error } = await client
      .from("products")
      .update({
        Codigo: code,
        personaje: name,
        serie: series,
        tipo: category,
        stock,
        precio: price,
        costo: cost,
        caja,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { message: `El código "${code}" ya está registrado.` },
          { status: 409 }
        );
      }
      throw new Error(`No se pudo actualizar el producto: ${error.message}`);
    }
    if (!data) {
      return NextResponse.json({ message: "El artículo ya no existe en el inventario." }, { status: 404 });
    }

    return NextResponse.json({ product: mapSupabaseProduct(data as Record<string, unknown>) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al actualizar producto.";
    console.error("Product update error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
