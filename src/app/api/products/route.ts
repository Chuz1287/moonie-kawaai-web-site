import { NextResponse } from "next/server";
import {
  getCloudinaryCloudName,
  getProductCloudinaryFolder,
  getProductCoverUrl,
} from "@/lib/cloudinary";
import { fetchProductsFromSupabase, mapSupabaseProduct } from "@/services/catalog";
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/types/store";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const dynamic = "force-dynamic";

type CloudinaryAsset = {
  asset_folder?: string;
  public_id: string;
  version: number;
};

type CloudinarySearchResponse = {
  resources?: CloudinaryAsset[];
  next_cursor?: string;
  error?: { message?: string };
};

async function fetchCurrentCoverVersions(): Promise<Map<string, number>> {
  const cloudName = getCloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("No están configuradas las credenciales de lectura de Cloudinary.");
  }

  const versions = new Map<string, number>();
  let nextCursor: string | undefined;

  do {
    const body: Record<string, string> = {
      expression: "asset_folder=moonie-kawaii/products/* AND resource_type:image",
      max_results: "500",
    };
    if (nextCursor) body.next_cursor = nextCursor;

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    const result = (await response.json()) as CloudinarySearchResponse;
    if (!response.ok) {
      throw new Error(
        result.error?.message ?? "No se pudieron consultar las versiones de las portadas."
      );
    }

    for (const asset of result.resources ?? []) {
      const fileName = asset.public_id.split("/").at(-1)?.toLocaleLowerCase();
      const productFolder = asset.public_id.split("/").slice(0, -1).join("/");
      if (fileName === "cover" && Number.isSafeInteger(asset.version)) {
        versions.set(productFolder, asset.version);
      }
    }
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return versions;
}

export async function GET() {
  let products: Product[];
  try {
    products = await fetchProductsFromSupabase();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo consultar el inventario.";
    console.error("Product inventory query failed:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
  const privateCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const publicCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  console.info("[Products API] Cloudinary configuration check.", {
    privateCloudNameConfigured: Boolean(privateCloudName),
    publicCloudNameConfigured: Boolean(publicCloudName),
    cloudNamesMatch: Boolean(privateCloudName && publicCloudName && privateCloudName === publicCloudName),
    productCount: products.length,
    productsWithCoverUrl: products.filter((product) => Boolean(product.coverImage)).length,
  });

  try {
    const coverVersions = await fetchCurrentCoverVersions();
    for (const product of products) {
      const folder = getProductCloudinaryFolder({
        code: product.code ?? "",
        category: product.category,
        series: product.series,
      });
      const version = folder ? coverVersions.get(folder) : undefined;
      if (version) {
        product.coverImage = getProductCoverUrl(
          {
            code: product.code ?? "",
            category: product.category,
            series: product.series,
          },
          version
        ) ?? undefined;
      }
    }
  } catch (error) {
    console.error("Could not retrieve current Cloudinary cover versions:", error);
  }

  return NextResponse.json({
    products,
    total: products.length,
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
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
