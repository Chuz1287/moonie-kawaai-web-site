import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request: Request) {
  const client = getClient();

  if (!client) {
    return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get("active") === "true";
  let query = client
    .from("events")
    .select("id, name, location, created_at, is_active")
    .order("created_at", { ascending: true });

  if (onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; location?: string };
    const name = String(body.name ?? "").trim();
    const location = String(body.location ?? "").trim();

    if (!name) {
      return NextResponse.json({ message: "El nombre del evento es obligatorio." }, { status: 400 });
    }

    const client = getClient();

    if (!client) {
      return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
    }

    const { data, error } = await client
      .from("events")
      .upsert({ id: name, name, location, is_active: true }, { onConflict: "id" })
      .select("id, name, location, created_at, is_active")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ event: data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No se pudo guardar el evento." },
      { status: 500 }
    );
  }
}