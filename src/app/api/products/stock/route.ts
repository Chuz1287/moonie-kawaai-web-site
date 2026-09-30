import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      productId?: string;
      quantity?: number;
      delta?: number;
      operation?: "add" | "remove" | "set";
    };

    const productId = String(body.productId ?? "").trim();
    const operation = body.operation ?? "add";
    const providedQuantity = Number(body.quantity ?? 0);
    const delta = Number(body.delta ?? 0);

    if (!productId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Falta el id del producto.",
        },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          message: "Supabase no está configurado.",
        },
        { status: 500 }
      );
    }

    const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const numericProductId = Number(productId);

    const { data: currentProduct, error: fetchError } = await client
      .from("products")
      .select("id, personaje, stock")
      .eq("id", numericProductId)
      .maybeSingle();

    if (fetchError || !currentProduct) {
      return NextResponse.json(
        {
          ok: false,
          message: "Producto no encontrado en la base de datos.",
        },
        { status: 404 }
      );
    }

    const currentStock = Number(currentProduct.stock ?? 0);
    let nextStock = currentStock;

    if (operation === "set") {
      nextStock = Math.max(0, Number.isFinite(providedQuantity) ? providedQuantity : currentStock);
    } else if (operation === "remove") {
      nextStock = Math.max(0, currentStock - Math.max(0, Number.isFinite(delta) ? delta : 0));
    } else {
      nextStock = Math.max(0, currentStock + Math.max(0, Number.isFinite(delta) ? delta : 0));
    }

    const { data, error } = await client
      .from("products")
      .update({ stock: nextStock })
      .eq("id", numericProductId)
      .select("id, personaje, stock")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          ok: false,
          message: error?.message ?? "No se pudo actualizar el stock.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      product: data,
      message: `Stock actualizado a ${nextStock}.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Error inesperado al ajustar stock.",
      },
      { status: 500 }
    );
  }
}
