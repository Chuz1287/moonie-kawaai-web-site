import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteSaleFromSupabase, updateSaleInSupabase } from "@/services/sales";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await deleteSaleFromSupabase(id);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        id,
        message: result.message ?? "No se pudo eliminar la venta.",
      },
      { status: result.status ?? 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id,
    message: "Venta eliminada correctamente",
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ ok: false, message: "Supabase no está configurado." }, { status: 500 });
    }

    const body = (await request.json()) as {
      items?: Array<{ productId?: string; quantity?: number; unitPrice?: number; note?: string }>;
    };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ ok: false, message: "La venta debe conservar al menos una pieza." }, { status: 400 });
    }

    const client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: sale, error: saleError } = await client
      .from("sales")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (saleError) {
      throw new Error(saleError.message);
    }
    if (!sale) {
      return NextResponse.json({ ok: false, message: "La venta no existe." }, { status: 404 });
    }

    const currentItems = Array.isArray(sale.items) ? sale.items as Array<Record<string, unknown>> : [];
    let legacyItems: Array<{ productId: string; quantity: number }> | null = null;
    let legacyProductId = "";
    if (currentItems.length === 0) {
      // Legacy sales keep a single product in top-level columns. Resolve it to one catalog product
      // by name; if that is ambiguous, refuse so inventory is never adjusted for the wrong product.
      const legacySale = sale as Record<string, unknown>;
      const legacyName = String(legacySale.personaje ?? "").trim();
      legacyProductId = String(legacySale.productId ?? legacySale.product_id ?? "").trim();
      if (!legacyProductId) {
        const { data: matches, error: matchError } = legacyName
          ? await client.from("products").select("id").eq("personaje", legacyName)
          : { data: [], error: null };
        if (matchError) {
          throw new Error(matchError.message);
        }
        if ((matches ?? []).length !== 1) {
          return NextResponse.json({
            ok: false,
            message: `No se pudo asociar la venta antigua "${legacyName || "sin nombre"}" a un único producto del catálogo; no se modificó nada.`,
          }, { status: 409 });
        }
        legacyProductId = String(matches![0].id);
      }
      legacyItems = [{ productId: legacyProductId, quantity: Number(legacySale.cantidad ?? 0) }];
    }
    if (currentItems.some((item) => !String(item.productId ?? item.product_id ?? "").trim())) {
      return NextResponse.json({
        ok: false,
        message: "Esta venta no tiene IDs de producto en todas sus piezas; no se puede editar sin arriesgar el inventario.",
      }, { status: 409 });
    }

    const requestedItems = body.items.map((item) => ({
      productId: String(item.productId ?? "").trim() || legacyProductId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      note: typeof item.note === "string" ? item.note.trim().slice(0, 200) : undefined,
    }));
    if (requestedItems.some((item) =>
      !item.productId ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isFinite(item.unitPrice) ||
      item.unitPrice < 0
    )) {
      return NextResponse.json({
        ok: false,
        message: "Cada pieza debe tener un producto, cantidad entera positiva y precio válido.",
      }, { status: 400 });
    }

    const uniqueProductIds = [...new Set(requestedItems.map((item) => item.productId))];
    const numericProductIds = uniqueProductIds.map(Number);
    if (numericProductIds.some((productId) => !Number.isSafeInteger(productId) || productId <= 0)) {
      return NextResponse.json({ ok: false, message: "Hay un ID de producto inválido." }, { status: 400 });
    }
    const { data: products, error: productsError } = await client
      .from("products")
      .select("*")
      .in("id", numericProductIds);
    if (productsError) {
      throw new Error(productsError.message);
    }
    const productMap = new Map((products ?? []).map((product) => [String(product.id), product]));
    if (uniqueProductIds.some((productId) => !productMap.has(productId))) {
      return NextResponse.json({ ok: false, message: "Uno o más productos ya no existen en el catálogo." }, { status: 409 });
    }

    const items = requestedItems.map((item) => {
      const product = productMap.get(item.productId)!;
      const storedNote = currentItems.find(
        (current) => String(current.productId ?? current.product_id ?? "") === item.productId
      )?.note;
      const note = item.note ?? (typeof storedNote === "string" ? storedNote : "");
      return {
        productId: item.productId,
        productName: String(product.personaje ?? product.name ?? "Producto"),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costo_unitario: Number(product.costo ?? product.cost ?? product.precio ?? product.price ?? 0),
        ...(note ? { note } : {}),
      };
    });
    const result = await updateSaleInSupabase(id, items, legacyItems);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status ?? 500 });
    }

    return NextResponse.json({ ok: true, id, sale: { ...sale, items, total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) } });
  } catch (error) {
    console.error("Update sale route error:", error);
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo actualizar la venta.",
    }, { status: 500 });
  }
}
