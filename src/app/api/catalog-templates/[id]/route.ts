import { NextResponse } from "next/server";
import {
  CatalogTemplateValidationError,
  deleteCatalogTemplate,
  updateCatalogTemplate,
  type CatalogTemplateInput,
} from "@/services/catalogTemplates";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  const status = error instanceof CatalogTemplateValidationError ? 400 : 500;
  const message = error instanceof Error ? error.message : "No se pudo guardar el catálogo.";
  return NextResponse.json({ message }, { status });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as CatalogTemplateInput;
    const template = await updateCatalogTemplate(id, body);
    return NextResponse.json({ template });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteCatalogTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
