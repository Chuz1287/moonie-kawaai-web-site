import { NextResponse } from "next/server";
import { fetchProductsFromSupabase, mapSupabaseProduct } from "@/services/catalog";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET() {
  const products = await fetchProductsFromSupabase();
  const privateCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const publicCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  console.info("[Products API] Cloudinary configuration check.", {
    privateCloudNameConfigured: Boolean(privateCloudName),
    publicCloudNameConfigured: Boolean(publicCloudName),
    cloudNamesMatch: Boolean(privateCloudName && publicCloudName && privateCloudName === publicCloudName),
    productCount: products.length,
    productsWithCoverUrl: products.filter((product) => Boolean(product.coverImage)).length,
  });

  return NextResponse.json({
    products,
    total: products.length,
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "La solicitud no contiene JSON válido." }, { status: 400 });
  }

  const code = String(body.code ?? "").trim();
  const name = String(body.name ?? "").trim();
  const requestedCategories = body.categories;
  if (requestedCategories !== undefined && (
    !Array.isArray(requestedCategories) ||
    requestedCategories.some((category) => typeof category !== "string")
  )) {
    return NextResponse.json({ message: "La lista de categorías no es válida." }, { status: 400 });
  }
  const categories = [...new Set(
    (Array.isArray(requestedCategories) ? requestedCategories : [body.category])
      .filter((category): category is string => typeof category === "string")
      .map((category) => category.trim())
      .filter(Boolean)
  )];
  const category = categories[0] ?? "";
  const series = String(body.series ?? "").trim();
  const shortDescription = String(body.shortDescription ?? "").trim();
  const price = Number(body.price ?? 0);
  const cost = Number(body.cost ?? 0);
  const stock = Number(body.stock ?? 0);

  if (!code || !name || !series || !category) {
    return NextResponse.json(
      { message: "El código, nombre, serie y categoría son obligatorios." },
      { status: 400 }
    );
  }
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(cost) ||
    cost < 0 ||
    !Number.isSafeInteger(stock) ||
    stock < 0
  ) {
    return NextResponse.json(
      { message: "Precio, costo y stock deben ser valores válidos y no negativos." },
      { status: 400 }
    );
  }
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: existingProduct, error: lookupError } = await client
      .from("products")
      .select("id")
      .eq("Codigo", code)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`No se pudo validar el código del producto: ${lookupError.message}`);
    }
    if (existingProduct) {
      return NextResponse.json(
        { message: `El código "${code}" ya está registrado.` },
        { status: 409 }
      );
    }

    const productRow: Record<string, string | number | string[]> = {
      Codigo: code,
      personaje: name,
      tipo: category,
      categorias: categories,
      serie: series,
      stock,
      precio: price,
      costo: cost,
      caja: shortDescription,
    };

    const { data, error } = await client
      .from("products")
      .insert(productRow)
      .select("*")
      .single();

    if (error) {
      const isDuplicateCode = error.code === "23505";
      if (isDuplicateCode) {
        return NextResponse.json(
          { message: `El código "${code}" ya está registrado.` },
          { status: 409 }
        );
      }
      throw new Error(`No se pudo crear el producto: ${error.message}`);
    }
    if (!data) {
      throw new Error("No se recibió el producto guardado.");
    }

    return NextResponse.json(
      { product: mapSupabaseProduct(data as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al crear producto.";
    console.error("Product creation error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
