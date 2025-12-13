import type { MetadataRoute } from "next";
import { getOrganizationBySlug } from "@/lib/organization";
import { createServices } from "@tour/services";

/**
 * Dynamic sitemap generation for each organization's booking site.
 *
 * Generates URLs for:
 * - Homepage (tour listing)
 * - Individual tour pages
 * - Static pages (about, contact, terms, privacy)
 */
export default async function sitemap({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<MetadataRoute.Sitemap> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    return [];
  }

  const baseUrl = `https://${org.slug}.book.tourplatform.com`;
  const services = createServices({ organizationId: org.id });

  // Get all public, active tours
  const { data: tours } = await services.tour.getAll(
    { status: "active", isPublic: true },
    { limit: 1000 } // Get all tours
  );

  const tourUrls: MetadataRoute.Sitemap = tours.map((tour) => ({
    url: `${baseUrl}/tours/${tour.slug}`,
    lastModified: tour.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...tourUrls,
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
