const serverEnv = {
  APP_ENV: process.env.APP_ENV ?? "development",
  APP_NAME: process.env.APP_NAME ?? "Monie Kawaai",
  API_BASE_URL: process.env.API_BASE_URL ?? "http://localhost:3000",
  DB_NAME: process.env.DB_NAME ?? "moonie-kawaai-db",
  SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "development-secret",
  SESSION_SECRET: process.env.SESSION_SECRET ?? "development-session-secret",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
};

const clientEnv = {
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "Monie Kawaai",
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET:
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "",
};

export const env = serverEnv;
export const publicEnv = clientEnv;

export function isServerSide(): boolean {
  return typeof window === "undefined";
}
