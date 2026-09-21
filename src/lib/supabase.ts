import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product, Sale } from "@/lib/db";

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
    const payload = sales.map(({ id, ...rest }) => rest);

    const { error } = await supabase.from("sales").upsert(payload, {
      onConflict: "saleNumber",
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
