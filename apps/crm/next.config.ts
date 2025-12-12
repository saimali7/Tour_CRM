import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tour/ui", "@tour/database", "@tour/validators", "@tour/config"],
  typedRoutes: true,
  // Ignore build errors for missing env vars during CI
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // We run typecheck separately
    ignoreBuildErrors: process.env.CI === "true",
  },
};

export default nextConfig;
