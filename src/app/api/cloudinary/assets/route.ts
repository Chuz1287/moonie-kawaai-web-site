import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCloudinaryCloudName } from "@/lib/cloudinary";
import { normalizeCloudinaryPath } from "@/lib/cloudinary-upload-path";

export const dynamic = "force-dynamic";

const productRoot = "moonie-kawaii/products";

class InvalidCloudinaryAssetPathError extends Error {}

type CloudinaryAsset = {
  asset_folder?: string;
  public_id: string;
  secure_url: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  created_at?: string;
};

type CloudinaryResponse = {
  resources?: CloudinaryAsset[];
  next_cursor?: string;
  folders?: { path: string }[];
  deleted?: Record<string, string>;
  error?: { message?: string };
};

function getCloudinaryCredentials() {
  const cloudName = getCloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary no está configurado. Revisa las variables privadas del servidor."
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function getAuthorization(apiKey: string, apiSecret: string): string {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).origin === new URL(request.url).origin;
}

function validateProductPath(value: unknown): string {
  if (typeof value !== "string") {
    throw new InvalidCloudinaryAssetPathError(
      "Se requiere una ruta válida de imagen."
    );
  }

  let path: string;
  try {
    path = normalizeCloudinaryPath(value);
  } catch (error) {
    throw new InvalidCloudinaryAssetPathError(
      error instanceof Error ? error.message : "La ruta de imagen no es válida."
    );
  }
  if (!path.startsWith(`${productRoot}/`)) {
    throw new InvalidCloudinaryAssetPathError(
      "Solo se pueden administrar imágenes dentro de products."
    );
  }

  return path;
}

function validateProductFolder(value: unknown): string {
  const path = validateProductPath(value);
  if (path === productRoot) {
    throw new InvalidCloudinaryAssetPathError(
      "No se puede eliminar la carpeta principal de productos."
    );
  }
  return path;
}

function encodeCloudinaryPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function getClientErrorStatus(error: unknown): number {
  return error instanceof SyntaxError ||
    error instanceof InvalidCloudinaryAssetPathError
    ? 400
    : 500;
}

async function cloudinaryError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | CloudinaryResponse
    | null;
  return body?.error?.message ?? "Cloudinary no pudo completar la operación.";
}

async function fetchProductAssets(
  cloudName: string,
  apiKey: string,
  apiSecret: string
): Promise<CloudinaryAsset[]> {
  const assets: CloudinaryAsset[] = [];
  let nextCursor: string | undefined;

  do {
    const body: Record<string, string> = {
      expression: `asset_folder=${productRoot}/* AND resource_type:image`,
      max_results: "500",
    };
    if (nextCursor) body.next_cursor = nextCursor;

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/search`,
      {
        method: "POST",
        headers: {
          Authorization: getAuthorization(apiKey, apiSecret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(await cloudinaryError(response));
    }

    const result = (await response.json()) as CloudinaryResponse;
    assets.push(...(result.resources ?? []));
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return assets;
}

async function collectFolderPaths(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  rootFolder: string
): Promise<string[]> {
  const folders = new Set([rootFolder]);
  const queue = [rootFolder];

  while (queue.length > 0) {
    const parent = queue.shift();
    if (!parent) continue;

    let nextCursor: string | undefined;
    do {
      const url = new URL(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/folders/${encodeCloudinaryPath(parent)}`
      );
      url.searchParams.set("max_results", "500");
      if (nextCursor) url.searchParams.set("next_cursor", nextCursor);

      const response = await fetch(url, {
        headers: { Authorization: getAuthorization(apiKey, apiSecret) },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await cloudinaryError(response));
      }

      const result = (await response.json()) as CloudinaryResponse;
      for (const folder of result.folders ?? []) {
        if (
          folder.path.startsWith(`${rootFolder}/`) &&
          folder.path.split("/").slice(0, -1).join("/") === parent &&
          !folders.has(folder.path)
        ) {
          folders.add(folder.path);
          queue.push(folder.path);
        }
      }
      nextCursor = result.next_cursor;
    } while (nextCursor);
  }

  return [...folders];
}

async function deleteCloudinaryAssets(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  publicIds: string[]
): Promise<{ deleted: number; errors: string[] }> {
  let deleted = 0;
  const errors: string[] = [];

  for (let index = 0; index < publicIds.length; index += 100) {
    const batch = publicIds.slice(index, index + 100);
    const body = new URLSearchParams();
    for (const publicId of batch) body.append("public_ids[]", publicId);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload`,
      {
        method: "DELETE",
        headers: {
          Authorization: getAuthorization(apiKey, apiSecret),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      errors.push(await cloudinaryError(response));
      continue;
    }

    const result = (await response.json()) as CloudinaryResponse;
    for (const publicId of batch) {
      if (result.deleted?.[publicId] === "deleted") {
        deleted += 1;
      } else {
        errors.push(
          `Cloudinary no confirmó la eliminación de ${publicId}.`
        );
      }
    }
  }

  return { deleted, errors };
}

export async function GET() {
  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
    const assets = await fetchProductAssets(cloudName, apiKey, apiSecret);
    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Cloudinary asset listing failed:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las imágenes.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Solicitud no permitida." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      publicId?: unknown;
      newName?: unknown;
    };
    const publicId = validateProductPath(body.publicId);
    const newName =
      typeof body.newName === "string" ? body.newName.trim() : "";

    if (
      !newName ||
      newName.includes("/") ||
      newName.includes("\\") ||
      newName === "." ||
      newName === ".."
    ) {
      return NextResponse.json(
        { message: "Escribe un nombre de archivo válido, sin rutas." },
        { status: 400 }
      );
    }

    const oldName = publicId.split("/").at(-1) ?? "";
    if (oldName.toLocaleLowerCase() === "cover") {
      return NextResponse.json(
        {
          message:
            "El archivo Cover no se puede renombrar porque el catálogo lo usa como imagen principal del producto.",
        },
        { status: 400 }
      );
    }

    const folder = publicId.split("/").slice(0, -1).join("/");
    const newPublicId = validateProductPath(`${folder}/${newName}`);
    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureParameters = {
      from_public_id: publicId,
      invalidate: "true",
      overwrite: "false",
      timestamp: String(timestamp),
      to_public_id: newPublicId,
    };
    const signatureBase = Object.entries(signatureParameters)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    const signature = createHash("sha1")
      .update(`${signatureBase}${apiSecret}`)
      .digest("hex");
    const formData = new URLSearchParams({
      ...signatureParameters,
      api_key: apiKey,
      signature,
    });
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/rename`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: await cloudinaryError(response) },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: "Imagen renombrada correctamente." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo renombrar la imagen.";
    return NextResponse.json({ message }, { status: getClientErrorStatus(error) });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Solicitud no permitida." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      publicId?: unknown;
      publicIds?: unknown;
      folders?: unknown;
    };
    const rawPublicIds = Array.isArray(body.publicIds)
      ? body.publicIds
      : body.publicId === undefined
        ? []
        : [body.publicId];
    const publicIds = [...new Set(rawPublicIds.map(validateProductPath))];
    const folders = Array.isArray(body.folders)
      ? [...new Set(body.folders.map(validateProductFolder))]
      : [];

    if (publicIds.length === 0 && folders.length === 0) {
      return NextResponse.json(
        { message: "Selecciona al menos una imagen o carpeta." },
        { status: 400 }
      );
    }
    if (publicIds.length > 1000 || folders.length > 100) {
      return NextResponse.json(
        {
          message:
            "La solicitud supera el límite: selecciona hasta 1000 imágenes y 100 carpetas por operación.",
        },
        { status: 400 }
      );
    }

    const folderRoots = folders.filter(
      (folder) =>
        !folders.some(
          (other) =>
            other !== folder && folder.startsWith(`${other}/`)
        )
    );
    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();

    // Discover the entire folder structure before deleting anything.
    const folderPaths = new Set<string>();
    for (const folder of folderRoots) {
      for (const path of await collectFolderPaths(
        cloudName,
        apiKey,
        apiSecret,
        folder
      )) {
        folderPaths.add(path);
      }
    }

    const folderPrefixes = [...folderRoots].map((folder) => `${folder}/`);
    const folderAssetIds = folderRoots.length
      ? (await fetchProductAssets(cloudName, apiKey, apiSecret))
          .filter((asset) => {
            const assetFolder =
              asset.asset_folder ??
              asset.public_id.split("/").slice(0, -1).join("/");
            return folderPrefixes.some(
              (prefix) =>
                assetFolder.startsWith(prefix) ||
                asset.public_id.startsWith(prefix)
            );
          })
          .map((asset) => asset.public_id)
      : [];
    const selectedAssetIds = publicIds.filter(
      (publicId) =>
        !folderPrefixes.some((prefix) => publicId.startsWith(prefix))
    );
    const assetIds = [...new Set([...selectedAssetIds, ...folderAssetIds])];
    const assetResult = await deleteCloudinaryAssets(
      cloudName,
      apiKey,
      apiSecret,
      assetIds
    );

    const folderErrors: string[] = [];
    let deletedFolders = 0;
    const orderedFolders = [...folderPaths].sort(
      (first, second) => second.split("/").length - first.split("/").length
    );
    for (const folder of orderedFolders) {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/folders/${encodeCloudinaryPath(folder)}`,
        {
          method: "DELETE",
          headers: { Authorization: getAuthorization(apiKey, apiSecret) },
          cache: "no-store",
        }
      );

      if (response.ok || response.status === 404) {
        deletedFolders += 1;
      } else {
        folderErrors.push(`${folder}: ${await cloudinaryError(response)}`);
      }
    }

    const errors = [...assetResult.errors, ...folderErrors];
    return NextResponse.json(
      {
        message:
          errors.length > 0
            ? `Eliminación parcial: ${assetResult.deleted} imagen(es) y ${deletedFolders} carpeta(s) eliminadas; ${errors.length} operación(es) pendientes.`
            : `${assetResult.deleted} imagen(es) y ${deletedFolders} carpeta(s) eliminadas correctamente.`,
        deletedImages: assetResult.deleted,
        deletedFolders,
        errors,
      },
      { status: errors.length > 0 ? 207 : 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la imagen.";
    return NextResponse.json({ message }, { status: getClientErrorStatus(error) });
  }
}
