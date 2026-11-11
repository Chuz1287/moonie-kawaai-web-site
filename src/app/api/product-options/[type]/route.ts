import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

function getOptionConfig(type: string): {
  sqlKey: "category" | "series";
} | null {
  if (type === "category") {
    return { sqlKey: "category" };
  }
  if (type === "series") {
    return { sqlKey: "series" };
  }
  return null;
}

function getClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase no está configurado.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const config = getOptionConfig(type);
  if (!config) {
    return NextResponse.json({ message: "El tipo de opción no es válido." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "La solicitud no contiene JSON válido." }, { status: 400 });
  }

  const oldName = typeof body.oldName === "string" ? body.oldName.trim() : "";
  const newName = typeof body.newName === "string" ? body.newName.trim() : "";
  if (!oldName || !newName) {
    return NextResponse.json({ message: "Indica el nombre actual y el nuevo nombre." }, { status: 400 });
  }
  if (oldName === newName) {
    return NextResponse.json({ message: "El nombre nuevo debe ser diferente." }, { status: 400 });
  }

  try {
    const client = getClient();
    const { error } = await client.rpc("rename_product_option", {
      option_type: config.sqlKey,
      old_name: oldName,
      new_name: newName,
    });
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ message: "Ya existe una opción con ese nombre." }, { status: 409 });
      }
      if (error.code === "23503") {
        return NextResponse.json(
          { message: "No se puede renombrar la opción porque hay artículos que usan el nombre nuevo." },
          { status: 409 }
        );
      }
      if (error.code === "P0002") {
        return NextResponse.json({ message: "No se encontró la opción indicada." }, { status: 404 });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ option: newName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo renombrar la opción.";
    console.error("Product option rename error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const config = getOptionConfig(type);
  if (!config) {
    return NextResponse.json({ message: "El tipo de opción no es válido." }, { status: 404 });
  }

  const url = new URL(_request.url);
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!name) {
    return NextResponse.json({ message: "Indica el nombre de la opción." }, { status: 400 });
  }

  try {
    const client = getClient();
    const { error } = await client.rpc("delete_product_option", {
      option_type: config.sqlKey,
      option_name: name,
    });
    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { message: "No se puede borrar: uno o más artículos todavía usan esta opción." },
          { status: 409 }
        );
      }
      if (error.code === "P0002") {
        return NextResponse.json({ message: "No se encontró la opción indicada." }, { status: 404 });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ deleted: name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo borrar la opción.";
    console.error("Product option deletion error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
