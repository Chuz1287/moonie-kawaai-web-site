import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

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