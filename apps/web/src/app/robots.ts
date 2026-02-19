import type { MetadataRoute } from "next";
import { headers } from "next/headers";

function getFallbackBaseUrl(): string {
  const explicitBase =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_WEB_URL;

  if (explicitBase) {
    return explicitBase.startsWith("http")
      ? explicitBase.replace(/\/$/, "")
      : `https://${explicitBase.replace(/\/$/, "")}`;
  }

  const bookingBase = process.env.NEXT_PUBLIC_BOOKING_BASE_URL;
  if (bookingBase) {
    const normalized = bookingBase.replace(/\/$/, "");
    const protocol = normalized.includes("localhost") ? "http" : "https";
    return `${protocol}://${normalized}`;
  }

  return "http://localhost:3001";
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  const forwardedProto = headersList.get("x-forwarded-proto");

  const baseUrl = host
    ? `${forwardedProto || (host.includes("localhost") ? "http" : "https")}://${host}`
    : getFallbackBaseUrl();

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
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
