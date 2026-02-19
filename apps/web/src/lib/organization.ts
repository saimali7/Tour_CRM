import { cache } from "react";
import { db, organizations, eq } from "@tour/database";
import type { Organization } from "@tour/database";

/**
 * Get organization by slug - cached per request
 *
 * Uses React's cache() to deduplicate database queries within a single request.
 */
export const getOrganizationBySlug = cache(
  async (slug: string): Promise<Organization | null> => {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    // Only return active organizations with web app enabled
    if (!org || org.status !== "active") {
      return null;
    }

    // Check if organization has web app access (not on free plan)
    if (org.plan === "free") {
      return null;
    }

    return org;
  }
);

/**
 * Get organization or throw an error
 */
export async function requireOrganization(slug: string): Promise<Organization> {
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    throw new Error(`Organization not found: ${slug}`);
  }

  return org;
}

/**
 * Generate the public URL for an organization's booking site
 */
export function getOrganizationBookingUrl(
  org: Organization,
  path: string = ""
): string {
  const baseUrl = process.env.NEXT_PUBLIC_BOOKING_BASE_URL || "localhost:3001";
  const protocol = baseUrl.includes("localhost") ? "http" : "https";

  // In production: {slug}.book.domain.com
  // In development: {slug}.localhost:3001
  if (baseUrl.includes("localhost")) {
    return `${protocol}://${org.slug}.${baseUrl}${path}`;
  }

  return `${protocol}://${org.slug}.${baseUrl}${path}`;
}

/**
 * Extract branding information from organization for theming
 */
export function getOrganizationBranding(org: Organization) {
  const socialLinks = extractSocialLinks(org);

  return {
    name: org.name,
    logo: org.logoUrl,
    primaryColor: org.primaryColor || "#0066FF",
    email: org.email,
    phone: org.phone,
    website: org.website,
    address: formatAddress(org),
    timezone: org.timezone,
    currency: org.settings?.defaultCurrency || org.currency || "USD",
    socialLinks,
  };
}

/**
 * Format organization address
 */
function formatAddress(org: Organization): string | null {
  const parts = [org.address, org.city, org.state, org.postalCode, org.country].filter(
    Boolean
  );

  return parts.length > 0 ? parts.join(", ") : null;
}

function extractSocialLinks(org: Organization): Record<string, string> {
  const settings = (org.settings || {}) as Record<string, unknown>;
  const socialSettings = settings.socialLinks as Record<string, unknown> | undefined;

  const raw = {
    instagram: socialSettings?.instagram,
    facebook: socialSettings?.facebook,
    tiktok: socialSettings?.tiktok,
    youtube: socialSettings?.youtube,
    x: socialSettings?.x,
    tripadvisor: socialSettings?.tripadvisor,
  };

  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => {
      return typeof entry[1] === "string" && entry[1].trim().length > 0;
    })
  );
}
