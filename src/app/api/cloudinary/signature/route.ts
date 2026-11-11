import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeCloudinaryPath } from "@/lib/cloudinary-upload-path";

const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY?.trim();
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
const privateCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const publicCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
const cloudinaryCloudName = privateCloudName || publicCloudName;
const allowedAssetRoot = "moonie-kawaii";

export async function POST(request: Request) {
  if (!cloudinaryApiKey || !cloudinaryApiSecret || !cloudinaryCloudName) {
    return NextResponse.json(
      {
        message:
          "Configura CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el servidor para habilitar la carga por lote.",
      },
      { status: 500 }
    );
  }

  console.info("[Cloudinary signature] Server configuration check.", {
    cloudNameConfigured: true,
    cloudNameSource: privateCloudName ? "CLOUDINARY_CLOUD_NAME" : "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
    cloudNamesMatch: Boolean(
      privateCloudName && publicCloudName && privateCloudName === publicCloudName
    ),
    apiKeyConfigured: true,
    apiSecretConfigured: true,
  });

  let body: { assetFolder?: unknown; publicId?: unknown };
  try {
    body = (await request.json()) as { assetFolder?: unknown; publicId?: unknown };
  } catch {
    return NextResponse.json(
      { message: "La solicitud de firma no contiene JSON válido." },
      { status: 400 }
    );
  }

  if (typeof body.assetFolder !== "string" || typeof body.publicId !== "string") {
    return NextResponse.json(
      { message: "La carpeta y el identificador de imagen son obligatorios." },
      { status: 400 }
    );
  }

  let assetFolder: string;
  let publicId: string;
  try {
    assetFolder = normalizeCloudinaryPath(body.assetFolder);
    publicId = normalizeCloudinaryPath(body.publicId);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "La ruta de Cloudinary no es válida.",
      },
      { status: 400 }
    );
  }

  if (
    publicId.length > 255 ||
    (assetFolder !== allowedAssetRoot &&
      !assetFolder.startsWith(`${allowedAssetRoot}/`)) ||
    !publicId.startsWith(`${assetFolder}/`) ||
    publicId === `${assetFolder}/`
  ) {
    return NextResponse.json(
      {
        message:
          "El destino debe estar dentro de moonie-kawaii y el identificador dentro de su carpeta.",
      },
      { status: 400 }
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const parameters = {
    asset_folder: assetFolder,
    overwrite: "false",
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const signatureBase = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const signature = createHash("sha1")
    .update(`${signatureBase}${cloudinaryApiSecret}`)
    .digest("hex");

  return NextResponse.json({
    cloudName: cloudinaryCloudName,
    apiKey: cloudinaryApiKey,
    timestamp,
    signature,
    assetFolder,
    publicId,
  });
}
