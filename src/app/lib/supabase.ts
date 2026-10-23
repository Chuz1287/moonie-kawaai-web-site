import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
