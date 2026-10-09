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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { is_active?: boolean };

    if (typeof body.is_active !== "boolean") {
      return NextResponse.json({ message: "Indica si el evento debe estar activo o cerrado." }, { status: 400 });
    }

    const client = getClient();
    if (!client) {
      return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
    }

    const { data, error } = await client
      .from("events")
      .update({ is_active: body.is_active })
      .eq("id", id)
      .select("id, name, location, created_at, is_active")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ message: "El evento no existe." }, { status: 404 });
    }

    return NextResponse.json({
      event: data,
      message: body.is_active ? "Evento reactivado." : "Evento cerrado.",
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No se pudo actualizar el evento." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const client = getClient();

  if (!client) {
    return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
  }

  const { count, error: salesError } = await client
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("event_id", id);

  if (salesError) {
    return NextResponse.json({ message: salesError.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { message: "No se puede borrar este evento porque tiene ventas asociadas. Las ventas históricas se conservaron." },
      { status: 409 }
    );
  }

  const { data, error } = await client
    .from("events")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: "El evento no existe." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id, message: "Evento eliminado." });
}