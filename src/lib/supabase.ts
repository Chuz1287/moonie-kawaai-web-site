import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product, Sale } from "@/lib/db";
import type { PosSaleRecord } from "@/services/pos";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const isSupabaseConfigured =
  supabaseUrl.startsWith("https://") && supabaseAnonKey.length > 0;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

export type SyncSummary = {
  synced: number;
  message: string;
};

export async function syncProductsToSupabase(
  products: Product[]
): Promise<SyncSummary> {
  if (!supabase) {
    return {
      synced: 0,
      message: "Supabase is not configured. Local sync is still active.",
    };
  }

  try {
    const payload = products.map(({ id, ...rest }) => rest);

    const { error } = await supabase
      .from("products")
      .upsert(payload, { onConflict: "code" });

    if (error) {
      throw error;
    }

    return {
      synced: payload.length,
      message: "Products synced successfully.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error while syncing products.";

    return {
      synced: 0,
      message,
    };
  }
}

function toSupabaseSaleRows(sale: Sale | PosSaleRecord): Array<Record<string, string | number | null>> {
  const timestamp = new Date(
    "createdAt" in sale ? sale.createdAt : new Date().toISOString()
  );

  const items = "items" in sale ? sale.items : sale.products;

  return items.map((item, index) => {
    const unitPrice = Number("unitPrice" in item ? item.unitPrice : item.precio_venta_unitario ?? 0);
    const quantity = Number("quantity" in item ? item.quantity : item.cantidad ?? 0);
    const total = unitPrice * quantity;

    return {
      id: `${("saleNumber" in sale ? sale.saleNumber : sale.id)}-${index + 1}`,
      personaje: String("productName" in item ? item.productName : item.name ?? "Venta"),
      serie: "default",
      tipo: "venta",
      cantidad: quantity,
      precio_venta_unitario: unitPrice,
      costo_unitario: 0,
      total,
      ganancia: 0,
      fecha: timestamp.toISOString().slice(0, 10),
      hora: timestamp.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }),
      event_id: "eventId" in sale ? sale.eventId || "default" : "default",
      created_at: timestamp.toISOString(),
    };
  });
}

export async function syncSalesToSupabase(
  sales: Sale[]
): Promise<SyncSummary> {
  if (!supabase) {
    return {
      synced: 0,
      message: "Supabase is not configured. Local sync is still active.",
    };
  }

  try {
    const payload = sales.flatMap((sale) => toSupabaseSaleRows(sale));

    const { error } = await supabase.from("sales").upsert(payload, {
      onConflict: "id",
    });

    if (error) {
      throw error;
    }

    return {
      synced: payload.length,
      message: "Sales synced successfully.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error while syncing sales.";

    return {
      synced: 0,
      message,
    };
  }
}

export async function syncSaleToSupabase(sale: PosSaleRecord): Promise<SyncSummary> {
  if (!supabase) {
    return {
      synced: 0,
      message: "Supabase is not configured. La venta se guardó localmente.",
    };
  }

  try {
    const payload = toSupabaseSaleRows(sale);

    const { error } = await supabase.from("sales").upsert(payload, {
      onConflict: "id",
    });

    if (error) {
      throw error;
    }

    return {
      synced: payload.length,
      message: "Venta sincronizada con Supabase.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error while syncing sale.";

    return {
      synced: 0,
      message,
    };
  }
}
