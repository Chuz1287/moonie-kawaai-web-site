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

export type CatalogProductStockUpdate = {
  id: string;
  stock: number;
};

export type EventRow = {
  id: string;
  name: string;
  created_at?: string | null;
};

export async function upsertEventToSupabase(name: string): Promise<EventRow | null> {
  const normalized = name.trim();

  if (!supabase || !normalized) {
    return null;
  }

  try {
    const payload = {
      id: normalized,
      name: normalized,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("events")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as EventRow;
  } catch (error) {
    console.error("Error creating event in Supabase", error);
    return null;
  }
}

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

export async function syncCatalogStockToSupabase(
  products: Array<{ id: string; stock: number }>
): Promise<SyncSummary> {
  if (!supabase) {
    return {
      synced: 0,
      message: "Supabase is not configured. El stock quedó localmente actualizado.",
    };
  }

  try {
    const payload = products.map((product) => ({
      id: String(product.id),
      stock: Number(product.stock ?? 0),
    }));

    const { error } = await supabase.from("products").upsert(payload, {
      onConflict: "id",
    });

    if (error) {
      throw error;
    }

    return {
      synced: payload.length,
      message: "Stock actualizado en Supabase.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error while syncing stock.";

    return {
      synced: 0,
      message,
    };
  }
}

type SupabaseSaleRowItem = {
  productId?: string | number;
  product_id?: string | number;
  name?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  cantidad?: number;
  precio_venta_unitario?: number;
};

type SupabaseSaleLike = {
  id?: string;
  saleNumber?: string;
  createdAt?: string;
  eventId?: string;
  items?: SupabaseSaleRowItem[];
  products?: SupabaseSaleRowItem[];
};

function toSupabaseSaleRows(sale: Sale | PosSaleRecord | SupabaseSaleLike): Array<Record<string, string | number | null | object[]>> {
  const timestamp = new Date(
    "createdAt" in sale ? sale.createdAt ?? new Date().toISOString() : new Date().toISOString()
  );

  const items = Array.isArray((sale as SupabaseSaleLike).items)
    ? (sale as SupabaseSaleLike).items ?? []
    : Array.isArray((sale as SupabaseSaleLike).products)
      ? (sale as SupabaseSaleLike).products ?? []
      : [];

  const normalizedItems = items.map((item) => ({
    productId: item.productId ?? item.product_id ?? null,
    productName: item.productName ?? item.name ?? "Venta",
    quantity: Number(item.quantity ?? item.cantidad ?? 0),
    unitPrice: Number(item.unitPrice ?? item.precio_venta_unitario ?? 0),
  }));

  const rawSaleId = "saleNumber" in sale ? sale.saleNumber ?? sale.id : sale.id ?? "sale-unknown";
  const saleId = typeof rawSaleId === "string" && rawSaleId.trim() ? rawSaleId : "sale-unknown";
  const total = "total" in sale ? Number(sale.total ?? 0) : normalizedItems.reduce((sum, item) => sum + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0), 0);

  return [{
    sale_number: saleId,
    items: normalizedItems,
    total,
    payment_method: "paymentMethod" in sale && sale.paymentMethod ? sale.paymentMethod : "cash",
    status: "status" in sale && sale.status ? sale.status : "completed",
    created_at: timestamp.toISOString(),
    synced_at: new Date().toISOString(),
  }];
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
    const payload = sales.map((sale) => ({
      sale_number: sale.saleNumber || `sale-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      items: sale.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      total: Number(sale.total ?? 0),
      payment_method: sale.paymentMethod || "cash",
      status: sale.status || "completed",
      created_at: sale.createdAt || new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("sales").upsert(payload, {
      onConflict: "sale_number",
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
    const payload = [{
      sale_number: sale.id,
      items: sale.products.map((item) => ({
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      total: Number(sale.total ?? 0),
      payment_method: "cash",
      status: "completed",
      created_at: sale.createdAt || new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }];

    const { error } = await supabase.from("sales").upsert(payload, {
      onConflict: "sale_number",
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
