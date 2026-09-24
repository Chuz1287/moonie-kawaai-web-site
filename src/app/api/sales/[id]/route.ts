import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return NextResponse.json({
    ok: true,
    id,
    message: "Venta eliminada localmente",
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
