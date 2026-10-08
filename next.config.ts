import type { NextConfig } from "next";
import packageJson from "./package.json";

console.log(`[Next.js] Package version: ${packageJson.version}`);

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
