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

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      is_active?: boolean;
      start_date?: string;
      end_date?: string;
    };

    const hasStatusUpdate = typeof body.is_active === "boolean";
    const hasDateUpdate = body.start_date !== undefined || body.end_date !== undefined;

    if (!hasStatusUpdate && !hasDateUpdate) {
      return NextResponse.json({ message: "Indica el estado o las fechas que deseas actualizar." }, { status: 400 });
    }

    const update: { is_active?: boolean; start_date?: string; end_date?: string } = {};
    if (hasStatusUpdate) {
      update.is_active = body.is_active;
    }
    if (hasDateUpdate) {
      const startDate = String(body.start_date ?? "");
      const endDate = String(body.end_date ?? "");

      if (!isValidDate(startDate) || !isValidDate(endDate) || endDate < startDate) {
        return NextResponse.json(
          { message: "Indica un rango de fechas válido; la fecha de fin no puede ser anterior a la de inicio." },
          { status: 400 }
        );
      }

      update.start_date = startDate;
      update.end_date = endDate;
    }

    const client = getClient();
    if (!client) {
      return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
    }

    const { data, error } = await client
      .from("events")
      .update(update)
      .eq("id", id)
      .select("id, name, location, created_at, is_active, start_date, end_date")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ message: "El evento no existe." }, { status: 404 });
    }

    return NextResponse.json({
      event: data,
      message: hasDateUpdate
        ? "Fechas del evento actualizadas."
        : body.is_active ? "Evento reactivado." : "Evento cerrado.",
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