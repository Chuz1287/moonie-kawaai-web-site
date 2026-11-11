import { NextResponse } from "next/server";
import { getCloudinaryCloudName, getProductCloudinaryFolder } from "@/lib/cloudinary";
import { fetchProductsFromSupabase } from "@/services/catalog";
import type { Product } from "@/types/store";

export const dynamic = "force-dynamic";

type CloudinaryResource = {
  asset_folder?: string;
  public_id: string;
  secure_url: string;
};

type CloudinarySearchResponse = {
  resources?: CloudinaryResource[];
  next_cursor?: string;
  error?: { message?: string };
};

async function fetchCloudinaryResources(): Promise<CloudinaryResource[]> {
  const privateCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const publicCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const cloudName = getCloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  console.info("[Catalog API] Cloudinary configuration check.", {
    privateCloudNameConfigured: Boolean(privateCloudName),
    publicCloudNameConfigured: Boolean(publicCloudName),
    cloudNamesMatch: Boolean(privateCloudName && publicCloudName && privateCloudName === publicCloudName),
    cloudNameSource: privateCloudName ? "CLOUDINARY_CLOUD_NAME" : publicCloudName ? "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" : "missing",
    apiKeyConfigured: Boolean(apiKey),
    apiSecretConfigured: Boolean(apiSecret),
  });

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary no está configurado para consultar las imágenes del catálogo.");
  }

  const resources: CloudinaryResource[] = [];
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
      throw new Error(result.error?.message ?? "Cloudinary no pudo devolver las imágenes.");
    }

    resources.push(...(result.resources ?? []));
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return resources;
}

function mapImagesByProduct(
  products: Product[],
  resources: CloudinaryResource[]
): Record<string, string[]> {
  const folders = new Map<string, Product[]>();
  for (const product of products) {
    const folder = getProductCloudinaryFolder({
      code: product.code ?? "",
      category: product.category,
      series: product.series,
    });
    if (!folder) continue;
    const matchingProducts = folders.get(folder) ?? [];
    matchingProducts.push(product);
    folders.set(folder, matchingProducts);
  }

  const resourcesByFolder = new Map<string, CloudinaryResource[]>();
  for (const resource of resources) {
    const folder = resource.asset_folder ?? resource.public_id.split("/").slice(0, -1).join("/");
    if (!folders.has(folder) || !resource.secure_url) continue;
    const matchingResources = resourcesByFolder.get(folder) ?? [];
    matchingResources.push(resource);
    resourcesByFolder.set(folder, matchingResources);
  }

  const imagesByProduct: Record<string, string[]> = {};
  for (const [folder, matchingProducts] of folders) {
    const folderResources = resourcesByFolder.get(folder) ?? [];
    folderResources.sort((first, second) => {
      const firstIsCover = first.public_id.split("/").at(-1)?.toLocaleLowerCase() === "cover";
      const secondIsCover = second.public_id.split("/").at(-1)?.toLocaleLowerCase() === "cover";
      if (firstIsCover !== secondIsCover) return firstIsCover ? -1 : 1;
      return first.public_id.localeCompare(second.public_id, "es-MX");
    });
    const images = [...new Set(folderResources.map((resource) => resource.secure_url))].slice(0, 5);
    for (const product of matchingProducts) {
      imagesByProduct[product.id] = images;
    }
  }

  return imagesByProduct;
}

export async function GET() {
  try {
    const products = await fetchProductsFromSupabase({ fallbackOnError: false });
    const resources = await fetchCloudinaryResources();

    return NextResponse.json({
      products,
      imagesByProduct: mapImagesByProduct(products, resources),
    });
  } catch (error) {
    console.error("Catalog generation data error:", error);
    const message = error instanceof Error ? error.message : "No se pudo preparar el catálogo.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
