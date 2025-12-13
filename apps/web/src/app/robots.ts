import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/no-org",
          "/_next/",
        ],
      },
    ],
    // Dynamic sitemap based on organization
    // The actual sitemap.xml is generated dynamically per org
  };
}
