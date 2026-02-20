import { createServices } from "@tour/services";
import { NextResponse } from "next/server";
import { ALL_CATEGORY_SLUGS } from "@/lib/category-config";
import { getOrganizationBookingUrl, getOrganizationBySlug } from "@/lib/organization";
import { getTripInspirationArticles } from "@/lib/trip-inspiration-content";

type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const parts = [`<loc>${escapeXml(entry.url)}</loc>`];
      if (entry.lastModified) {
        parts.push(`<lastmod>${entry.lastModified.toISOString()}</lastmod>`);
      }
      if (entry.changeFrequency) {
        parts.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
      }
      if (typeof entry.priority === "number") {
        parts.push(`<priority>${entry.priority.toFixed(1)}</priority>`);
      }
      return `<url>${parts.join("")}</url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    return NextResponse.json(
      { error: `Organization not found: ${slug}` },
      { status: 404 }
    );
  }

  const baseUrl = getOrganizationBookingUrl(org).replace(/\/$/, "");
  const services = createServices({ organizationId: org.id });
  const { data: tours } = await services.tour.getAll(
    { status: "active", isPublic: true },
    { limit: 1000 }
  );

  const now = new Date();
  const inspirationArticles = getTripInspirationArticles();
  const entries: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...ALL_CATEGORY_SLUGS.map((categorySlug) => ({
      url: `${baseUrl}/experiences/${categorySlug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...tours.map((tour) => ({
      url: `${baseUrl}/tours/${tour.slug}`,
      lastModified: tour.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}/trip-inspiration`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...inspirationArticles.map((article) => ({
      url: `${baseUrl}/trip-inspiration/${article.slug}`,
      lastModified: new Date(`${article.publishedAt}T00:00:00`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  return new NextResponse(buildSitemapXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
