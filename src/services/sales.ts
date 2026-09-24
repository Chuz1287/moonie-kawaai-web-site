import { createClient } from "@supabase/supabase-js";

export type SaleRecord = {
  id: string;
  personaje: string;
  serie: string;
  tipo: string;
  cantidad: number;
  precio_venta_unitario: number;
  costo_unitario: number;
  total: number;
  ganancia: number;
  fecha: string;
  hora: string;
  event_id?: string | null;
  created_at?: string | null;
};

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

    return data as SaleRecord[];
  } catch {
    return [];
  }
}
