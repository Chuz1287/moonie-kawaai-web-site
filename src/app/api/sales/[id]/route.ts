import { NextResponse } from "next/server";
import { deleteSaleFromSupabase } from "@/services/sales";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const deleted = await deleteSaleFromSupabase(id);

  if (!deleted) {
    return NextResponse.json(
      {
        ok: false,
        id,
        message: "La venta no existe o no se pudo eliminar en Supabase",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    id,
    message: "Venta eliminada correctamente",
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await request.json();

  return NextResponse.json({
    ok: true,
    id,
    updated: payload,
    message: "Venta actualizada localmente",
  });
}
