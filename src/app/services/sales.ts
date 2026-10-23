import { createClient } from "@supabase/supabase-js";

export type SaleRecord = {
  id: string;
  sale_number?: string | null;
  items?: Array<{
    productId?: string | number | null;
    product_id?: string | number | null;
    name?: string | null;
    productName?: string | null;
    quantity?: number | null;
    cantidad?: number | null;
    unitPrice?: number | null;
    precio_venta_unitario?: number | null;
    costo_unitario?: number | null;
  }>;
  total: number;
  payment_method?: string | null;
  status?: string | null;
  created_at?: string | null;
  synced_at?: string | null;
  personaje?: string;
  cantidad?: number;
  precio_venta_unitario?: number;
  costo_unitario?: number;
  ganancia?: number;
  fecha?: string;
  hora?: string;
  event_id?: string | null;
  productId?: string | null;
};

function toSafeDate(value: unknown): Date {
  if (value === null || value === undefined || value === "") {
    return new Date();
  }

  const parsed = new Date(value as string | number | Date);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function compareSalesNewestFirst(a: SaleRecord, b: SaleRecord): number {
  const aTimestamp = Date.parse(String(a.created_at ?? ""));
  const bTimestamp = Date.parse(String(b.created_at ?? ""));
  const safeATimestamp = Number.isFinite(aTimestamp) ? aTimestamp : Date.parse(`${a.fecha ?? ""}T${a.hora ?? "00:00:00"}`);
  const safeBTimestamp = Number.isFinite(bTimestamp) ? bTimestamp : Date.parse(`${b.fecha ?? ""}T${b.hora ?? "00:00:00"}`);

  if (Number.isFinite(safeATimestamp) && Number.isFinite(safeBTimestamp) && safeATimestamp !== safeBTimestamp) {
    return safeBTimestamp - safeATimestamp;
  }

  return String(b.id).localeCompare(String(a.id));
}

function normalizeSaleRow(row: Record<string, unknown>): SaleRecord {
  const rawItems = Array.isArray(row.items) ? row.items : [];
  const rawCreatedAt = row.created_at ?? row.createdAt;
  const timestamp = rawCreatedAt
    ? toSafeDate(rawCreatedAt)
    : toSafeDate(`${String(row.fecha ?? new Date(0).toISOString().slice(0, 10))}T${String(row.hora ?? "00:00:00")}`);
  const saleDate = typeof row.fecha === "string" && row.fecha.trim()
    ? row.fecha.trim().slice(0, 10)
    : timestamp.toISOString().slice(0, 10);
  const saleTime = typeof row.hora === "string" && row.hora.trim()
    ? row.hora.trim()
    : timestamp.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });

  const normalizedItems = rawItems.map((item, index) => {
    const itemRecord = item as Record<string, unknown>;
    const unitPrice = Number(itemRecord.unitPrice ?? itemRecord.precio_venta_unitario ?? 0);
    const rawCost = Number(itemRecord.costo_unitario ?? itemRecord.costo ?? itemRecord.cost ?? 0);
    return {
      ...itemRecord,
      productId: itemRecord.productId ?? itemRecord.product_id ?? null,
      productName: String(itemRecord.productName ?? itemRecord.name ?? `Producto ${index + 1}`),
      quantity: Number(itemRecord.quantity ?? itemRecord.cantidad ?? 0),
      unitPrice,
      costo_unitario: rawCost > 0 ? rawCost : unitPrice > 0 ? unitPrice * 0.7 : 0,
    };
  });
  const firstItem = normalizedItems[0];
  const lineTotal = normalizedItems.reduce(
    (sum, item) => sum + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0),
    0
  );
  const lineProfit = normalizedItems.reduce(
    (sum, item) =>
      sum + (Number(item.unitPrice ?? 0) - Number(item.costo_unitario ?? 0)) * Number(item.quantity ?? 0),
    0
  );
  const total = Number(row.total ?? lineTotal);

  const legacyPersonaje = typeof row.personaje === "string" ? row.personaje : "Venta";
  const legacyCantidad = Number(row.cantidad ?? 0);
  const legacyPrice = Number(row.precio_venta_unitario ?? (firstItem ? firstItem.unitPrice : row.total) ?? 0);
  const rawCost = Number(row.costo_unitario ?? row.costo ?? row.cost ?? 0);
  const fallbackCost = rawCost > 0 ? rawCost : legacyPrice > 0 ? legacyPrice * 0.7 : 0;

  return {
    id: String(row.id ?? row.sale_number ?? `sale-${timestamp.getTime()}`),
    sale_number: row.sale_number ? String(row.sale_number) : null,
    items: normalizedItems as SaleRecord["items"],
    total,
    payment_method: typeof row.payment_method === "string" ? String(row.payment_method) : "cash",
    status: typeof row.status === "string" ? String(row.status) : "completed",
    created_at: timestamp.toISOString(),
    synced_at: row.synced_at ? String(row.synced_at) : null,
    personaje: firstItem ? String(firstItem.productName) : legacyPersonaje,
    cantidad: firstItem ? Number(firstItem.quantity ?? 0) : legacyCantidad,
    precio_venta_unitario: legacyPrice,
    costo_unitario: firstItem ? Number(firstItem.costo_unitario ?? 0) : fallbackCost,
    ganancia: Number(row.ganancia ?? (normalizedItems.length ? lineProfit : Math.max(0, total - fallbackCost * legacyCantidad))),
    fecha: saleDate,
    hora: saleTime,
    event_id: row.event_id ? String(row.event_id) : "default",
    productId: firstItem?.productId ? String(firstItem.productId) : (row.productId ? String(row.productId) : null),
  };
}

export function getSaleProfit(sale: SaleRecord): number {
  if (sale.items?.length) {
    return sale.items.reduce((sum, item) => {
      const quantity = Number(item.quantity ?? item.cantidad ?? 0);
      const unitPrice = Number(item.unitPrice ?? item.precio_venta_unitario ?? 0);
      const unitCost = Number(item.costo_unitario ?? unitPrice * 0.7);
      return sum + (unitPrice - unitCost) * quantity;
    }, 0);
  }

  const qty = Number(sale.cantidad ?? 0);
  const revenue = Number(sale.total ?? 0);
  const baseCost = Number(
    sale.costo_unitario ?? sale.precio_venta_unitario ?? 0
  );
  const fallbackCost = baseCost > 0 ? baseCost : revenue > 0 && qty > 0 ? revenue / qty * 0.7 : 0;

  if (sale.ganancia !== undefined && sale.ganancia !== null && Number(sale.ganancia) >= 0) {
    return Number(sale.ganancia);
  }

  return Number(Math.max(0, revenue - fallbackCost * qty));
}

export function groupSalesByDay(sales: SaleRecord[]) {
  const groups = new Map<string, SaleRecord[]>();

  for (const sale of [...sales].sort(compareSalesNewestFirst)) {
    const key = sale.created_at?.slice(0, 10) || sale.fecha || "Sin fecha";
    const existing = groups.get(key) ?? [];
    existing.push(sale);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .map(([date, items]) => ({
      date,
      items: items.sort(compareSalesNewestFirst),
      total: items.reduce((sum, item) => sum + Number(item.total || 0), 0),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function groupSalesByEventOrDate(
  sales: SaleRecord[],
  eventNames: Map<string, string>
) {
  const groups = new Map<string, { label: string; sortDate: string; sortTimestamp: number; items: SaleRecord[] }>();

  for (const sale of [...sales].sort(compareSalesNewestFirst)) {
    const saleDate = sale.fecha || "Sin fecha";
    const saleTimestamp = Date.parse(String(sale.created_at ?? "")) || Date.parse(`${saleDate}T${sale.hora ?? "00:00:00"}`) || 0;
    const eventId = sale.event_id && sale.event_id !== "default" ? sale.event_id : "";
    const eventName = eventId ? eventNames.get(eventId) : undefined;
    const key = eventName && eventId ? `event:${eventId}` : `date:${saleDate}`;
    const group = groups.get(key) ?? {
      label: eventName || saleDate,
      sortDate: saleDate,
      sortTimestamp: saleTimestamp,
      items: [],
    };

    group.items.push(sale);
    if (saleDate > group.sortDate) {
      group.sortDate = saleDate;
    }
    group.sortTimestamp = Math.max(group.sortTimestamp, saleTimestamp);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      date: group.label,
      items: group.items.sort(compareSalesNewestFirst),
      total: group.items.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
      sortDate: group.sortDate,
      sortTimestamp: group.sortTimestamp,
    }))
    .sort((a, b) => b.sortTimestamp - a.sortTimestamp || b.sortDate.localeCompare(a.sortDate) || a.date.localeCompare(b.date));
}

export async function fetchSalesFromApi(): Promise<SaleRecord[]> {
  const response = await fetch("/api/sales");
  const payload = (await response.json()) as { sales?: SaleRecord[]; message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "No se pudieron cargar las ventas.");
  }

  return Array.isArray(payload.sales) ? payload.sales : [];
}

export async function fetchSalesFromSupabase(): Promise<SaleRecord[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[sales service] supabase config", {
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey),
    url: url ? url.replace(/\?.*$/, "") : null,
  });

  if (!url || !anonKey) {
    console.error("[sales service] Missing Supabase env values");
    return [];
  }

  try {
    const client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.time("[sales service] Fetching sales from Supabase");
    // Fetch only recent 500 sales for better performance
    // Older sales can be loaded on demand with pagination
    const { data, error } = await client
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    console.timeEnd("[sales service] Fetching sales from Supabase");

    if (error || !data) {
      console.error("[sales service] Supabase query error:", error);
      return [];
    }

    console.time("[sales service] Normalizing sales data");
    const rows = data as Array<Record<string, unknown>>;
    const sorted = rows.map((row) => normalizeSaleRow(row)).sort(compareSalesNewestFirst);
    console.timeEnd("[sales service] Normalizing sales data");

    console.log("[sales service] rows returned from Supabase:", sorted.length);
    console.log("[sales service] first row sample:", sorted[0] ?? null);
    return sorted;
  } catch (error) {
    console.error("[sales service] unexpected fetch error:", error);
    return [];
  }
}

export type SaleMutationResult = {
  ok: boolean;
  message?: string;
  status?: number;
};

function getSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key };
}

function getMutationErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "No se pudo guardar la venta.";
}

export async function updateSaleInSupabase(
  id: string,
  items: Array<{ productId: string; quantity: number; unitPrice: number }>
): Promise<SaleMutationResult> {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key || !id) {
    return { ok: false, status: 500, message: "Supabase no está configurado." };
  }
  try {
    const client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const { error } = await client.rpc("update_sale_with_inventory", {
      sale_id: id,
      new_items: items,
    });
    if (error) {
      console.error("Update sale error:", error);
      return { ok: false, status: /no existe|not found/i.test(error.message) ? 404 : 409, message: error.message };
    }
    return { ok: true };
  } catch (error) {
    console.error("Update sale exception:", error);
    return { ok: false, status: 500, message: getMutationErrorMessage(error) };
  }
}

export async function deleteSaleFromSupabase(id: string): Promise<SaleMutationResult> {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key || !id) {
    return { ok: false, status: 500, message: "Supabase no está configurado." };
  }

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.rpc("delete_sale_with_inventory", { sale_id: id });
    if (error) {
      console.error("Delete sale error:", error);
      return { ok: false, status: /no existe|not found/i.test(error.message) ? 404 : 409, message: error.message };
    }
    return { ok: true };
  } catch (error) {
    console.error("Delete sale exception:", error);
    return { ok: false, status: 500, message: getMutationErrorMessage(error) };
  }
}
