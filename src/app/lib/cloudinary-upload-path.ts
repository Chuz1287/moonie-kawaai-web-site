const invalidPathCharacters = /[?&#\\%<>+]/u;

export type CloudinaryImagePath = {
  assetFolder: string;
  publicId: string;
};

export function normalizeCloudinaryPath(value: string): string {
  const segments = value
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        invalidPathCharacters.test(segment) ||
        /[\u0000-\u001f\u007f]/u.test(segment)
    )
  ) {
    throw new Error(
      "La ruta contiene un nombre no permitido. Evita ?, &, #, %, +, <, > y segmentos . o .."
    );
  }

  const normalizedPath = segments.join("/");
  if (normalizedPath.length > 255) {
    throw new Error("La ruta de Cloudinary no puede superar 255 caracteres.");
  }

  return normalizedPath;
}

export function createCloudinaryImagePath(
  destinationFolder: string,
  relativeFilePath: string
): CloudinaryImagePath {
  const destination = normalizeCloudinaryPath(destinationFolder);
  const relativePath = normalizeCloudinaryPath(relativeFilePath);
  const pathSegments = relativePath.split("/");
  const fileName = pathSegments.pop();

  if (!fileName) {
    throw new Error("No se pudo identificar el nombre del archivo.");
  }

  const extensionIndex = fileName.lastIndexOf(".");
  const publicFileName =
    extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
  if (!publicFileName.trim()) {
    throw new Error("El archivo necesita un nombre válido.");
  }

  const localFolder = pathSegments.join("/");
  const assetFolder = normalizeCloudinaryPath(
    [destination, localFolder].filter(Boolean).join("/")
  );
  const publicId = normalizeCloudinaryPath(`${assetFolder}/${publicFileName}`);

  return { assetFolder, publicId };
}
