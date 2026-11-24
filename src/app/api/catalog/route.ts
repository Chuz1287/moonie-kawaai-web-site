import { NextResponse } from "next/server";
import {
  getCloudinaryCloudName,
  getProductCloudinaryFolder,
  getProductCoverUrl,
} from "@/lib/cloudinary";
import { fetchProductsFromSupabase } from "@/services/catalog";
import type { Product } from "@/types/store";

export const dynamic = "force-dynamic";

type CloudinaryResource = {
  asset_folder?: string;
  public_id: string;
  secure_url: string;
  version?: number;
};

type CloudinarySearchResponse = {
  resources?: CloudinaryResource[];
  next_cursor?: string;
  error?: { message?: string };
};

function normalizeFolderPath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-MX"))
    .join("/");
}

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
  const productsByFolder = new Map<string, Product[]>();
  const productsByCode = new Map<string, Product[]>();

  for (const product of products) {
    const folder = getProductCloudinaryFolder({
      code: product.code ?? "",
      category: product.category,
      series: product.series,
    });
    if (folder) {
      const folderKey = normalizeFolderPath(folder);
      const folderProducts = productsByFolder.get(folderKey) ?? [];
      folderProducts.push(product);
      productsByFolder.set(folderKey, folderProducts);
    }

    const code = normalizeFolderPath(product.code ?? "");
    if (code) {
      const codeProducts = productsByCode.get(code) ?? [];
      codeProducts.push(product);
      productsByCode.set(code, codeProducts);
    }
  }

  const resourcesByProduct = new Map<string, CloudinaryResource[]>();
  for (const resource of resources) {
    const folder = resource.asset_folder ?? resource.public_id.split("/").slice(0, -1).join("/");
    if (
      !normalizeFolderPath(folder).startsWith("moonie-kawaii/products/") ||
      !resource.secure_url
    ) {
      continue;
    }

    const exactMatches = productsByFolder.get(normalizeFolderPath(folder));
    const folderCode = normalizeFolderPath(folder.split("/").at(-1) ?? "");
    const codeMatches = productsByCode.get(folderCode);
    const folderSeries = normalizeFolderPath(folder.split("/").at(-2) ?? "");
    const seriesMatches = codeMatches?.filter(
      (product) => normalizeFolderPath(product.series ?? "") === folderSeries
    );
    const matchingProducts = exactMatches ??
      (codeMatches?.length === 1
        ? codeMatches
        : seriesMatches?.length === 1
          ? seriesMatches
          : undefined);
    if (!matchingProducts) continue;

    for (const product of matchingProducts) {
      const productResources = resourcesByProduct.get(product.id) ?? [];
      productResources.push(resource);
      resourcesByProduct.set(product.id, productResources);
    }
  }

  const imagesByProduct: Record<string, string[]> = {};
  for (const product of products) {
    const productResources = resourcesByProduct.get(product.id) ?? [];
    productResources.sort((first, second) => {
      const firstIsCover = first.public_id.split("/").at(-1)?.toLocaleLowerCase() === "cover";
      const secondIsCover = second.public_id.split("/").at(-1)?.toLocaleLowerCase() === "cover";
      if (firstIsCover !== secondIsCover) return firstIsCover ? -1 : 1;
      return first.public_id.localeCompare(second.public_id, "es-MX");
    });
    const cloudinaryImages = [...new Set(productResources.map((resource) => resource.secure_url))];
    const databaseImages = product.gallery.filter(Boolean);
    const images = (cloudinaryImages.length > 0 ? cloudinaryImages : databaseImages).slice(0, 5);
    if (images.length > 0) {
      imagesByProduct[product.id] = images;
    }
  }

  return imagesByProduct;
}

export async function GET() {
  try {
    const products = await fetchProductsFromSupabase();
    const resources = await fetchCloudinaryResources();
    const coverResources = new Map<string, number>();
    for (const resource of resources) {
      const version = resource.version;
      if (
        resource.public_id.split("/").at(-1)?.toLocaleLowerCase() === "cover" &&
        typeof version === "number" &&
        Number.isSafeInteger(version)
      ) {
        coverResources.set(
          resource.public_id.split("/").slice(0, -1).join("/"),
          version
        );
      }
    }

    for (const product of products) {
      const folder = getProductCloudinaryFolder({
        code: product.code ?? "",
        category: product.category,
        series: product.series,
      });
      const version = folder ? coverResources.get(folder) : undefined;
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

    const allImagesByProduct = mapImagesByProduct(products, resources);
    const catalogProducts = products.filter(
      (product) =>
        product.stock > 0 &&
        (allImagesByProduct[product.id]?.length ?? 0) > 0
    );
    const catalogProductIds = new Set(catalogProducts.map((product) => product.id));
    const imagesByProduct = Object.fromEntries(
      Object.entries(allImagesByProduct).filter(([productId]) =>
        catalogProductIds.has(productId)
      )
    );

    return NextResponse.json({
      products: catalogProducts,
      imagesByProduct,
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Catalog generation data error:", error);
    const message = error instanceof Error ? error.message : "No se pudo preparar el catálogo.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
