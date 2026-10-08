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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getClient();

  if (!client) {
    return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
  }

  const { data, error } = await client
    .from("event_expenses")
    .select("id, event_id, category, description, amount, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ expenses: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      category?: string;
      description?: string;
      amount?: number;
    };
    const category = String(body.category ?? "").trim();
    const description = String(body.description ?? category).trim();
    const amount = Number(body.amount);

    if (!category || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Indica una categoría y un importe mayor que cero." },
        { status: 400 }
      );
    }

    const client = getClient();

    if (!client) {
      return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
    }

    const { data, error } = await client
      .from("event_expenses")
      .insert({ event_id: id, category, description, amount })
      .select("id, event_id, category, description, amount, created_at")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ expense: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No se pudo guardar el gasto." },
      { status: 500 }
    );
  }
}