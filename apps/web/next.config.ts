import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tour/ui", "@tour/database", "@tour/services", "@tour/validators", "@tour/config"],
  // Note: typedRoutes disabled until all static pages (about, contact, terms, privacy) are created
  // typedRoutes: true,
  // Ignore build errors for missing env vars during CI
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // We run typecheck separately
    ignoreBuildErrors: process.env.CI === "true",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
