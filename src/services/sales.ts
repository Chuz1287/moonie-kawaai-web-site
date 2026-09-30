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
};

function normalizeSaleRow(row: Record<string, unknown>): SaleRecord[] {
  const rawItems = Array.isArray(row.items) ? row.items : [];
  const timestamp = new Date(String(row.created_at ?? row.createdAt ?? Date.now()));

  if (rawItems.length > 0) {
    return rawItems.map((item, index) => {
      const itemRecord = item as Record<string, unknown>;
      const productName = String(
        itemRecord.productName ?? itemRecord.name ?? `Producto ${index + 1}`
      );
      const quantity = Number(itemRecord.quantity ?? itemRecord.cantidad ?? 0);
      const unitPrice = Number(
        itemRecord.unitPrice ?? itemRecord.precio_venta_unitario ?? 0
      );
      const productId = itemRecord.productId ?? itemRecord.product_id ?? null;

      return {
        id: String(row.id ?? row.sale_number ?? `sale-${timestamp.getTime()}-${index + 1}`),
        sale_number: row.sale_number ? String(row.sale_number) : null,
        items: rawItems as SaleRecord["items"],
        total: Number(row.total ?? quantity * unitPrice),
        payment_method: typeof row.payment_method === "string" ? String(row.payment_method) : "cash",
        status: typeof row.status === "string" ? String(row.status) : "completed",
        created_at: timestamp.toISOString(),
        synced_at: row.synced_at ? String(row.synced_at) : null,
        personaje: productName,
        cantidad: quantity,
        precio_venta_unitario: unitPrice,
        costo_unitario: 0,
        ganancia: 0,
        fecha: timestamp.toISOString().slice(0, 10),
        hora: timestamp.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }),
        productId: productId ? String(productId) : null,
      };
    });
  }

  const legacyPersonaje = typeof row.personaje === "string" ? row.personaje : "Venta";
  const legacyCantidad = Number(row.cantidad ?? 0);

  return [{
    id: String(row.id ?? row.sale_number ?? `sale-${timestamp.getTime()}`),
    sale_number: row.sale_number ? String(row.sale_number) : null,
    total: Number(row.total ?? 0),
    payment_method: typeof row.payment_method === "string" ? String(row.payment_method) : "cash",
    status: typeof row.status === "string" ? String(row.status) : "completed",
    created_at: timestamp.toISOString(),
    synced_at: row.synced_at ? String(row.synced_at) : null,
    personaje: legacyPersonaje,
    cantidad: legacyCantidad,
    precio_venta_unitario: Number(row.precio_venta_unitario ?? row.total ?? 0),
    costo_unitario: 0,
    ganancia: 0,
    fecha: timestamp.toISOString().slice(0, 10),
    hora: timestamp.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }),
  }];
}

export function getSaleProfit(sale: SaleRecord): number {
  const baseCost = Number(sale.costo_unitario ?? 0);
  const qty = Number(sale.cantidad ?? 0);
  const revenue = Number(sale.total ?? 0);

  return Number(sale.ganancia ?? Math.max(0, revenue - baseCost * qty));
}

export function groupSalesByDay(sales: SaleRecord[]) {
  const groups = new Map<string, SaleRecord[]>();

  for (const sale of sales) {
    const key = sale.fecha || sale.created_at || "Sin fecha";
    const existing = groups.get(key) ?? [];
    existing.push(sale);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .map(([date, items]) => ({
      date,
      items,
      total: items.reduce((sum, item) => sum + Number(item.total || 0), 0),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchSalesFromSupabase(): Promise<SaleRecord[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return [];
  }

  try {
    const client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await client.from("sales").select("*").order("created_at", {
      ascending: false,
    });

    if (error || !data) {
      return [];
    }

    const rows = data as Array<Record<string, unknown>>;
    const normalized = rows.flatMap((row) => normalizeSaleRow(row));

    return normalized.sort((a, b) => {
      const aDate = new Date(String(a.created_at ?? a.fecha ?? 0)).getTime();
      const bDate = new Date(String(b.created_at ?? b.fecha ?? 0)).getTime();
      return bDate - aDate;
    });
  } catch {
    return [];
  }
}

export async function deleteSaleFromSupabase(id: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !id) {
    return false;
  }

  try {
    const client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: saleRecord, error: fetchError } = await client
      .from("sales")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch sale before delete error:", fetchError);
      return false;
    }

    if (!saleRecord) {
      return false;
    }

    const itemName = String(saleRecord.personaje ?? saleRecord.items?.[0]?.productName ?? saleRecord.items?.[0]?.name ?? "").trim();
    const quantity = Number(saleRecord.cantidad ?? saleRecord.items?.[0]?.quantity ?? saleRecord.items?.[0]?.cantidad ?? 0);
    const productRefId =
      saleRecord.items?.[0]?.productId ?? saleRecord.items?.[0]?.product_id ?? saleRecord.productId ?? saleRecord.id ?? null;

    const productEntries = Array.isArray(saleRecord.items) ? saleRecord.items : [];
    const saleLines = productEntries.length > 0 ? productEntries : [{ name: itemName, quantity, productId: productRefId }];

    for (const line of saleLines) {
      const lineName = String(line.name ?? line.productName ?? itemName ?? "").trim();
      const lineQuantity = Number(line.quantity ?? line.cantidad ?? quantity ?? 0);
      const lineProductId = line.productId ?? line.product_id ?? productRefId ?? null;

      if (lineQuantity <= 0) {
        continue;
      }

      const { data: products, error: catalogError } = await client.from("products").select("id, name, stock");

      if (!catalogError && Array.isArray(products)) {
        const productMatch = products.find((product) => {
          const candidateId = String(product.id ?? "").trim().toLowerCase();
          const targetId = String(lineProductId ?? "").trim().toLowerCase();

          if (targetId && candidateId && targetId === candidateId) {
            return true;
          }

          const productName = String(product.name ?? "").trim().toLowerCase();
          return lineName ? productName === lineName.toLowerCase() : false;
        });

        if (productMatch) {
          const currentStock = Number(productMatch.stock ?? 0);
          const nextStock = Math.max(0, currentStock + lineQuantity);

          const { error: stockError } = await client
            .from("products")
            .update({ stock: nextStock })
            .eq("id", productMatch.id);

          if (stockError) {
            console.error("Restore stock error:", stockError);
          }
        }
      }
    }

    const { data, error } = await client.from("sales").delete().eq("id", id).select();

    if (error) {
      console.error("Delete sale error:", error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    console.error("Delete sale exception:", error);
    return false;
  }
}
