import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tour/ui", "@tour/database", "@tour/services", "@tour/validators", "@tour/config"],
  // Note: typedRoutes disabled until all static pages (about, contact, terms, privacy) are created
  // typedRoutes: true,
  typescript: {
    // We run typecheck separately
    ignoreBuildErrors: process.env.CI === "true",
  },
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
