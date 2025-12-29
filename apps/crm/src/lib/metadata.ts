import type { Metadata } from "next";

const APP_NAME = "Tour CRM";
const APP_DESCRIPTION = "Tour operations management platform";

interface PageMetadataOptions {
  title: string;
  description?: string;
  noIndex?: boolean;
}

/**
 * Generate consistent metadata for dashboard pages
 */
export function generatePageMetadata({
  title,
  description,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const fullTitle = `${title} | ${APP_NAME}`;

  return {
    title: fullTitle,
    description: description || APP_DESCRIPTION,
    robots: noIndex ? "noindex, nofollow" : undefined,
    openGraph: {
      title: fullTitle,
      description: description || APP_DESCRIPTION,
      type: "website",
    },
  };
}

/**
 * Page metadata configurations for all dashboard pages
 */
export const pageMetadata = {
  dashboard: {
    title: "Dashboard",
    description: "Overview of your tour operations",
  },
  bookings: {
    title: "Bookings",
    description: "Manage customer bookings and reservations",
  },
  tours: {
    title: "Tours",
    description: "Manage your tour catalog and schedules",
  },
  customers: {
    title: "Customers",
    description: "Customer database and relationship management",
  },
  guides: {
    title: "Guides",
    description: "Manage tour guides and assignments",
  },
  calendar: {
    title: "Calendar",
    description: "Visual calendar of scheduled tours",
  },
  analytics: {
    title: "Analytics",
    description: "Business metrics and performance insights",
  },
  reports: {
    title: "Reports",
    description: "Generate and export business reports",
  },
  reviews: {
    title: "Reviews",
    description: "Customer feedback and ratings",
  },
  promoCodes: {
    title: "Promo Codes",
    description: "Manage discounts and promotional codes",
  },
  communications: {
    title: "Communications",
    description: "Email templates and customer messaging",
  },
  availability: {
    title: "Availability",
    description: "Tour availability and scheduling",
  },
  settings: {
    title: "Settings",
    description: "Organization settings and preferences",
  },
  help: {
    title: "Help",
    description: "Documentation and support resources",
  },
} as const;
