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
