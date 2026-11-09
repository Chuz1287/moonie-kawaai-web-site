export type CloudinaryImageOptions = {
  width?: number;
  height?: number;
  crop?: "fill" | "scale" | "fit" | "limit" | "thumb" | "pad";
  quality?: "auto" | number;
  format?: "auto" | "jpg" | "png" | "webp";
  gravity?: string;
};

export type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  resource_type?: string;
};

export type CloudinarySignedUploadParams = {
  apiKey: string;
  timestamp: number;
  signature: string;
  assetFolder: string;
  publicId: string;
};

export class CloudinaryUploadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function getCloudinaryBaseUrl(): string {
  if (!cloudName) {
    return "";
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload`;
}

export function getOptimizedImageUrl(
  publicId: string,
  options: CloudinaryImageOptions = {}
): string {
  if (!cloudName) {
    return publicId;
  }

  const transformations: string[] = [];

  if (options.width) {
    transformations.push(`w_${options.width}`);
  }

  if (options.height) {
    transformations.push(`h_${options.height}`);
  }

  if (options.crop) {
    transformations.push(`c_${options.crop}`);
  }

  if (options.gravity) {
    transformations.push(`g_${options.gravity}`);
  }

  if (options.quality) {
    transformations.push(
      typeof options.quality === "number"
        ? `q_${options.quality}`
        : `q_${options.quality}`
    );
  }

  if (options.format) {
    transformations.push(`f_${options.format}`);
  }

  const transformationPath = transformations.length
    ? `${transformations.join(",")}/`
    : "";

  return `${getCloudinaryBaseUrl()}/${transformationPath}${publicId}`;
}

export type ProductCoverPath = {
  code: string;
  category: string;
  series?: string;
};

function getProductCloudinaryType(category: string): string | null {
  const normalizedCategory = category
    .trim()
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (["videojuego", "videojuegos"].includes(normalizedCategory)) {
    return "Videojuegos";
  }

  if (["anime", "chichona", "horror"].includes(normalizedCategory)) {
    return "Anime";
  }

  return null;
}

function getProductCloudinarySeries(series: string): string {
  const normalizedSeries = series
    .trim()
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const folderAliases: Record<string, string> = {
    baki: "Baki Hanma",
  };

  return folderAliases[normalizedSeries] ?? series.trim();
}

export function getProductCoverUrl({
  code,
  category,
  series,
}: ProductCoverPath): string | null {
  const normalizedCode = code.trim();
  const seriesFolder = series ? getProductCloudinarySeries(series) : "";
  const typeFolder = getProductCloudinaryType(category);
  const cloudinaryBaseUrl = getCloudinaryBaseUrl();

  if (!cloudinaryBaseUrl || !normalizedCode || !seriesFolder || !typeFolder) {
    return null;
  }

  const publicId = [
    "moonie-kawaii",
    "products",
    typeFolder,
    seriesFolder,
    normalizedCode,
    "Cover",
  ]
    .map(encodeURIComponent)
    .join("/");
  const optimizedUrl = getOptimizedImageUrl(publicId, {
    width: 300,
    height: 300,
    crop: "fill",
    gravity: "auto",
    quality: "auto",
    format: "webp",
  });

  return `${optimizedUrl}.webp`;
}

export async function uploadImage(file: File): Promise<CloudinaryUploadResult> {
  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "moonie-kawaii/products");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Cloudinary upload failed: ${message}`);
  }

  const data = (await response.json()) as CloudinaryUploadResult;
  return data;
}

export async function uploadImageToFolder(
  file: File,
  assetFolder: string,
  publicId: string
): Promise<CloudinaryUploadResult> {
  if (!cloudName) {
    throw new Error("Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.");
  }

  const signatureResponse = await fetch("/api/cloudinary/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetFolder, publicId }),
  });
  const signaturePayload = (await signatureResponse.json()) as
    | CloudinarySignedUploadParams
    | { message?: string };

  if (!signatureResponse.ok || !("signature" in signaturePayload)) {
    throw new Error(
      "message" in signaturePayload && signaturePayload.message
        ? signaturePayload.message
        : "No se pudo preparar la carga segura a Cloudinary."
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signaturePayload.apiKey);
  formData.append("timestamp", String(signaturePayload.timestamp));
  formData.append("signature", signaturePayload.signature);
  formData.append("asset_folder", signaturePayload.assetFolder);
  formData.append("public_id", signaturePayload.publicId);
  formData.append("overwrite", "false");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );
  const responseText = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new CloudinaryUploadError(
      responseText || "Cloudinary devolvió una respuesta no válida.",
      response.status
    );
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "object" &&
      payload.error !== null &&
      "message" in payload.error &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : "Cloudinary no pudo guardar esta imagen.";

    throw new CloudinaryUploadError(message, response.status);
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("public_id" in payload) ||
    typeof payload.public_id !== "string" ||
    !("secure_url" in payload) ||
    typeof payload.secure_url !== "string"
  ) {
    throw new CloudinaryUploadError(
      "Cloudinary no devolvió los datos esperados de la imagen.",
      response.status
    );
  }

  return payload as CloudinaryUploadResult;
}
