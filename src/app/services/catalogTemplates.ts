import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type CatalogTemplate = {
  id: string;
  name: string;
  percentageAdjustment: number | null;
  prices: Record<string, number>;
};

export type CatalogTemplateInput = {
  name?: unknown;
  percentageAdjustment?: unknown;
  prices?: unknown;
};

export class CatalogTemplateValidationError extends Error {}

type TemplateRow = {
  id: string;
  name: string;
  percentage_adjustment: number | string | null;
  catalog_template_prices?: { product_code: string; price: number | string }[] | null;
};

function getClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase no está configurado.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function parseName(value: unknown): string {
  const name = String(value ?? "").trim();
  if (!name) {
    throw new CatalogTemplateValidationError("El nombre del catálogo es obligatorio.");
  }
  if (name.length > 80) {
    throw new CatalogTemplateValidationError("El nombre del catálogo no puede tener más de 80 caracteres.");
  }
  return name;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function parsePercentage(value: unknown): number | null {
  const percentage = parseOptionalNumber(value);
  if (percentage === null) return null;
  if (!(percentage >= -100)) {
    throw new CatalogTemplateValidationError("El ajuste debe ser un porcentaje mayor o igual a -100.");
  }
  return percentage;
}

function parsePrices(value: unknown): Record<string, number | null> {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new CatalogTemplateValidationError("Los precios del catálogo no son válidos.");
  }

  const prices: Record<string, number | null> = {};
  for (const [code, rawPrice] of Object.entries(value)) {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      throw new CatalogTemplateValidationError("Hay un producto sin código en los precios.");
    }
    const price = parseOptionalNumber(rawPrice);
    if (price !== null && !(price >= 0)) {
      throw new CatalogTemplateValidationError(`El precio de ${trimmedCode} debe ser mayor o igual a 0.`);
    }
    prices[trimmedCode] = price;
  }
  return prices;
}

function toTemplate(row: TemplateRow): CatalogTemplate {
  const prices: Record<string, number> = {};
  for (const price of row.catalog_template_prices ?? []) {
    prices[price.product_code] = Number(price.price);
  }
  return {
    id: row.id,
    name: row.name,
    percentageAdjustment:
      row.percentage_adjustment === null ? null : Number(row.percentage_adjustment),
    prices,
  };
}

const templateSelect =
  "id, name, percentage_adjustment, catalog_template_prices(product_code, price)";

export async function listCatalogTemplates(): Promise<CatalogTemplate[]> {
  const { data, error } = await getClient()
    .from("catalog_templates")
    .select(templateSelect)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as TemplateRow[]).map(toTemplate);
}

export async function createCatalogTemplate(input: CatalogTemplateInput): Promise<CatalogTemplate> {
  const { data, error } = await getClient()
    .from("catalog_templates")
    .insert({
      name: parseName(input.name),
      percentage_adjustment: parsePercentage(input.percentageAdjustment),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  const { id } = data as { id: string };
  if (input.prices === undefined) {
    return updateCatalogTemplate(id, {});
  }
  return updateCatalogTemplate(id, { prices: input.prices });
}

export async function updateCatalogTemplate(
  id: string,
  input: CatalogTemplateInput
): Promise<CatalogTemplate> {
  const client = getClient();
  const templateUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.name !== undefined) templateUpdate.name = parseName(input.name);
  if (input.percentageAdjustment !== undefined) {
    templateUpdate.percentage_adjustment = parsePercentage(input.percentageAdjustment);
  }

  const { error: updateError } = await client
    .from("catalog_templates")
    .update(templateUpdate)
    .eq("id", id);
  if (updateError) throw new Error(updateError.message);

  const prices = parsePrices(input.prices);
  const codesToRemove = Object.keys(prices).filter((code) => prices[code] === null);
  const pricesToSave = Object.entries(prices)
    .filter(([, price]) => price !== null)
    .map(([productCode, price]) => ({
      template_id: id,
      product_code: productCode,
      price,
      updated_at: new Date().toISOString(),
    }));

  if (codesToRemove.length > 0) {
    const { error: deleteError } = await client
      .from("catalog_template_prices")
      .delete()
      .eq("template_id", id)
      .in("product_code", codesToRemove);
    if (deleteError) throw new Error(deleteError.message);
  }

  if (pricesToSave.length > 0) {
    const { error: upsertError } = await client
      .from("catalog_template_prices")
      .upsert(pricesToSave, { onConflict: "template_id,product_code" });
    if (upsertError) throw new Error(upsertError.message);
  }

  const { data, error } = await client
    .from("catalog_templates")
    .select(templateSelect)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return toTemplate(data as TemplateRow);
}

export async function deleteCatalogTemplate(id: string): Promise<void> {
  const { error } = await getClient().from("catalog_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
