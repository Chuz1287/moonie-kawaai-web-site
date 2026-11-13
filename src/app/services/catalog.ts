import type { Product } from "@/types/store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getProductCoverUrl } from "@/lib/cloudinary";

const productPageSize = 100;

const defaultImage =
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function getImageValues(row: Record<string, unknown>): string[] {
  const imageFields = [
    row.image,
    row.imagen,
    row.image_url,
    row.imagen_url,
    row.foto,
    row.foto_url,
  ];
  const galleryFields = [row.gallery, row.images, row.imagenes, row.fotos];
  const values = [
    ...imageFields,
    ...galleryFields.flatMap((value) => Array.isArray(value) ? value : []),
  ];

  return [...new Set(values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean))];
}

function getBoxIncluded(row: Record<string, unknown>): boolean | undefined {
  const value =
    row.box_included ??
    row.boxIncluded ??
    row.incluye_caja ??
    row.tiene_caja ??
    row.con_caja ??
    row.caja;

  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const normalized = String(value).trim().toLocaleLowerCase("es-MX");
  if (/^(sí|si|true|1|incluida|incluido|con caja)$/u.test(normalized)) {
    return true;
  }
  if (/^(no|false|0|sin caja|no incluida|no incluido)$/u.test(normalized)) {
    return false;
  }
  if (/\b(con caja|caja incluida|incluye caja)\b/u.test(normalized)) {
    return true;
  }
  if (/\b(sin caja|no incluye caja)\b/u.test(normalized)) {
    return false;
  }

  return undefined;
}

export function mapSupabaseProduct(row: Record<string, unknown>): Product {
  const name = String(row.personaje ?? row.character ?? row.name ?? "Producto sin nombre");
  const primaryCategory = String(row.tipo ?? row.category ?? row.categoria ?? "General").trim();
  const categories = Array.isArray(row.categorias)
    ? [...new Set(row.categorias
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean))]
    : [];
  const normalizedCategories = categories.length > 0
    ? categories
    : primaryCategory
      ? [primaryCategory]
      : ["General"];
  const category = normalizedCategories[0];
  const anime = row.anime ?? row.serie ?? row.series;
  const price = Number(row.precio ?? row.price ?? 0);
  const stock = Number(row.stock ?? 0);
  const rawCost = Number(row.costo ?? row.cost ?? 0);
  const normalizedCost = rawCost > 0 ? rawCost : price > 0 ? price * 0.7 : 0;
  const slug = toSlug(String(row.slug ?? name));
  const featured = stock > 0;
  const code = String(row.Codigo ?? row.code ?? "").trim();
  const series = anime ? String(anime) : undefined;
  const images = getImageValues(row);
  const coverImage = getProductCoverUrl({
    code,
    category,
    series,
  });

  return {
    id: String(row.id ?? slug),
    code,
    slug,
    name,
    description: String(
      row.Descripcion ??
      row.descripcion ??
      row.description ??
      [category, anime, row.personaje, row.character, row.characters]
        .filter(Boolean)
        .map(String)
        .join(" ")
    ),
    shortDescription: [row.caja ? String(row.caja) : null, row.marca ? String(row.marca) : null]
      .filter(Boolean)
      .join(" • ") || "Artículo disponible",
    price: Number.isFinite(price) ? price : 0,
    cost: Number.isFinite(normalizedCost) ? normalizedCost : 0,
    compareAtPrice: rawCost > 0 && rawCost > price ? rawCost : undefined,
    stock: Number.isFinite(stock) ? stock : 0,
    featured,
    category,
    categories: normalizedCategories,
    series,
    height: String(row.Altura ?? row.altura ?? row.height ?? "").trim() || undefined,
    boxIncluded: getBoxIncluded(row),
    image: images[0] ?? defaultImage,
    coverImage: coverImage ?? undefined,
    gallery: images,
    tags: [anime, row.personaje, row.character, row.characters, ...normalizedCategories, row.marca]
      .filter(Boolean)
      .map(String),
  };
}

/**
 * Read every inventory row, even when Supabase/PostgREST is configured with a
 * maximum response size smaller than the requested range.
 */
export async function fetchAllProductRows(
  client: SupabaseClient
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("id", { ascending: true })
      .range(offset, offset + productPageSize - 1);

    if (error) {
      throw new Error(`No se pudo consultar el inventario: ${error.message}`);
    }

    const page = (data ?? []) as Record<string, unknown>[];
    if (page.length === 0) break;

    rows.push(...page);
    // Advance by the number actually returned, not the requested page size:
    // PostgREST may cap a 100-row request at 99 (or another configured value).
    offset += page.length;
  }

  return rows;
}

export async function fetchProductsFromSupabase(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase no está configurado; no se puede consultar el inventario.");
  }

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const rows = await fetchAllProductRows(client);
  return rows.map(mapSupabaseProduct);
}

export async function getProducts(): Promise<Product[]> {
  return fetchProductsFromSupabase();
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((product) => product.featured);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.slug === slug);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.id === id);
}

export async function getCategories(): Promise<string[]> {
  const products = await getProducts();
  return [...new Set(products.flatMap((product) => product.categories ?? [product.category]))];
}

export async function updateStock(productId: string, quantity: number): Promise<Product | undefined> {
  const product = await getProductById(productId);

  if (!product) {
    return undefined;
  }

  product.stock = Math.max(0, quantity);
  return product;
}
