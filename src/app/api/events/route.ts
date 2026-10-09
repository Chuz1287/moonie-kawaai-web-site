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
    .select("id, name, location, created_at, is_active, start_date, end_date")
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
    const body = (await request.json()) as {
      name?: string;
      location?: string;
      start_date?: string;
      end_date?: string;
    };
    const name = String(body.name ?? "").trim();
    const location = String(body.location ?? "").trim();
    const startDate = String(body.start_date ?? "");
    const endDate = String(body.end_date ?? "");

    if (!name) {
      return NextResponse.json({ message: "El nombre del evento es obligatorio." }, { status: 400 });
    }
    if (!isValidDate(startDate) || !isValidDate(endDate) || endDate < startDate) {
      return NextResponse.json(
        { message: "Indica un rango de fechas válido; la fecha de fin no puede ser anterior a la de inicio." },
        { status: 400 }
      );
    }

    const client = getClient();

    if (!client) {
      return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
    }

    const { data, error } = await client
      .from("events")
      .upsert({
        id: name,
        name,
        location,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      }, { onConflict: "id" })
      .select("id, name, location, created_at, is_active, start_date, end_date")
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

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}