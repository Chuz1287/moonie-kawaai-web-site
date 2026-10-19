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
      items?: Array<{ productId?: string; quantity?: number; unitPrice?: number }>;
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

    const rawCurrentItems = Array.isArray(sale.items) ? sale.items as Array<Record<string, unknown>> : [];
    const currentItems = rawCurrentItems.length
      ? rawCurrentItems
      : (() => {
          // Legacy sales can only be safely edited if they retained a stable product reference.
          const legacySale = sale as Record<string, unknown>;
          const productId = legacySale.productId ?? legacySale.product_id;
          if (productId === null || productId === undefined) return [];
          return [{
            productId,
            productName: legacySale.personaje,
            quantity: legacySale.cantidad,
            unitPrice: legacySale.precio_venta_unitario,
            costo_unitario: legacySale.costo_unitario,
          }];
        })();
    if (currentItems.some((item) => !String(item.productId ?? item.product_id ?? "").trim())) {
      return NextResponse.json({
        ok: false,
        message: "Esta venta antigua no tiene IDs de producto; no se puede editar sin arriesgar el inventario.",
      }, { status: 409 });
    }

    const requestedItems = body.items.map((item) => ({
      productId: String(item.productId ?? "").trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
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
      return {
        productId: item.productId,
        productName: String(product.personaje ?? product.name ?? "Producto"),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costo_unitario: Number(product.costo ?? product.cost ?? product.precio ?? product.price ?? 0),
      };
    });
    const result = await updateSaleInSupabase(id, items);
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
