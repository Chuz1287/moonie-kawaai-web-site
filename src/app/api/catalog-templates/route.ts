import { NextResponse } from "next/server";
import {
  CatalogTemplateValidationError,
  listCatalogTemplates,
  createCatalogTemplate,
  type CatalogTemplateInput,
} from "@/services/catalogTemplates";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  const status = error instanceof CatalogTemplateValidationError ? 400 : 500;
  const message = error instanceof Error ? error.message : "No se pudo guardar el catálogo.";
  return NextResponse.json({ message }, { status });
}

export async function GET() {
  try {
    const templates = await listCatalogTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CatalogTemplateInput;
    const template = await createCatalogTemplate(body);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
