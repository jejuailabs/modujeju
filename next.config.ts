import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  images: { unoptimized: true },
  serverExternalPackages: ["firebase-admin"],
};
export default nextConfig;
