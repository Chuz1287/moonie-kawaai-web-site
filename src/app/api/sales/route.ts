import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchSalesFromSupabase } from "@/services/sales";
import { fetchProductsFromSupabase } from "@/services/catalog";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET() {
  const sales = await fetchSalesFromSupabase();

  return NextResponse.json({
    sales,
    total: sales.length,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      cart?: Array<{ productId: string; quantity: number; unitPrice?: number; price?: number }>;
      eventId?: string;
    };

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          message: "Supabase no está configurado.",
        },
        { status: 500 }
      );
    }

    const cart = Array.isArray(body.cart) ? body.cart : [];

    if (cart.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "El carrito está vacío.",
        },
        { status: 400 }
      );
    }

    const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const productIds = cart
      .map((item) => String(item.productId ?? ""))
      .filter(Boolean);

    if (productIds.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "No hay productos válidos en el carrito.",
        },
        { status: 400 }
      );
    }

    const numericIds = productIds.map((id) => Number(id)).filter(Number.isFinite);

    const { data: products, error: productsError } = await client
      .from("products")
      .select("id, personaje, stock, costo, precio")
      .in("id", numericIds);

    if (productsError || !products) {
      return NextResponse.json(
        {
          ok: false,
          message: productsError?.message ?? "No se pudo consultar el inventario.",
        },
        { status: 500 }
      );
    }

    const productMap = new Map(
      products.map((product) => [String(product.id ?? ""), product])
    );

    const saleItems = cart.map((item) => {
      const product = productMap.get(String(item.productId ?? ""));
      const quantity = Number(item.quantity ?? 0);
      const productPrice = Number(product?.precio ?? 0);
      const requestedPrice = item.unitPrice ?? item.price;
      const parsedPrice = Number(requestedPrice ?? productPrice);
      const unitPrice = Number.isFinite(parsedPrice) ? parsedPrice : productPrice;
      const productCost = Number(product?.costo ?? product?.precio ?? unitPrice * 0.7);

      return {
        productId: String(item.productId ?? ""),
        productName: product?.personaje ?? "Producto",
        quantity,
        unitPrice,
        costo_unitario: productCost,
      };
    });

    for (const item of cart) {
      const productId = String(item.productId ?? "");
      const product = productMap.get(productId);

      if (!product) {
        continue;
      }

      const currentStock = Number(product.stock ?? 0);
      const quantity = Number(item.quantity ?? 0);
      const nextStock = Math.max(0, currentStock - quantity);

      const { error: updateError } = await client
        .from("products")
        .update({ stock: nextStock })
        .eq("id", Number(productId));

      if (updateError) {
        throw new Error(updateError.message || "No se pudo descontar el stock.");
      }
    }

    const total = saleItems.reduce(
      (sum, item) => sum + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0),
      0
    );

    const saleId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const firstLine = saleItems[0];

    const { data: createdSale, error: saleError } = await client
      .from("sales")
      .insert({
        id: saleId,
        personaje: firstLine?.productName ?? "Venta",
        serie: "General",
        tipo: "Venta",
        cantidad: firstLine ? Number(firstLine.quantity ?? 0) : 0,
        precio_venta_unitario: firstLine ? Number(firstLine.unitPrice ?? 0) : 0,
        costo_unitario: firstLine ? Number(firstLine.costo_unitario ?? 0) : 0,
        total,
        ganancia: Math.max(0, total - (firstLine ? Number(firstLine.costo_unitario ?? 0) * Number(firstLine.quantity ?? 0) : 0)),
        fecha: now.toLocaleDateString("en-CA"),
        hora: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
        event_id: body.eventId || "default",
        created_at: now.toISOString(),
      })
      .select()
      .single();

    if (saleError || !createdSale) {
      return NextResponse.json(
        {
          ok: false,
          message: saleError?.message ?? "No se pudo registrar la venta.",
        },
        { status: 500 }
      );
    }

    const refreshedProducts = await fetchProductsFromSupabase();

    return NextResponse.json({
      ok: true,
      sale: createdSale,
      products: refreshedProducts,
      message: "Venta registrada y stock actualizado en vivo.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Error inesperado al cerrar la venta.",
      },
      { status: 500 }
    );
  }
}
