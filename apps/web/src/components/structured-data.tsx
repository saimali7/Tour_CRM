import type { Tour, Organization, TourPricingTier } from "@tour/database";
import { getOrganizationBookingUrl } from "@/lib/organization";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ReviewSummary {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

interface TourStructuredDataProps {
  tour: Tour;
  org: Organization;
  pricingTiers: TourPricingTier[];
  baseUrl?: string;
  reviewSummary?: ReviewSummary;
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQItem[];
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function getCanonicalBaseUrl(org: Organization, baseUrl?: string): string {
  if (baseUrl && baseUrl.trim()) {
    return normalizeBaseUrl(baseUrl.trim());
  }
  return normalizeBaseUrl(getOrganizationBookingUrl(org));
}

function toAbsoluteUrl(url: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${baseUrl}${url}`;
  }

  return `${baseUrl}/${url}`;
}

/**
 * Generates Schema.org structured data for tours.
 * This helps search engines understand the content and can enable rich results.
 */
export function TourStructuredData({
  tour,
  org,
  pricingTiers,
  baseUrl,
  reviewSummary,
  breadcrumbs,
  faqs,
}: TourStructuredDataProps) {
  const orgBaseUrl = getCanonicalBaseUrl(org, baseUrl);
  const tourUrl = toAbsoluteUrl(`/tours/${tour.slug}`, orgBaseUrl);
  const organizationUrl = org.website ? org.website : orgBaseUrl;
  const currency = org.settings?.defaultCurrency || "USD";
  const lowestPrice = pricingTiers.length > 0
    ? Math.min(...pricingTiers.map((t) => parseFloat(t.price)))
    : parseFloat(tour.basePrice);
  const highestPrice = pricingTiers.length > 0
    ? Math.max(...pricingTiers.map((t) => parseFloat(t.price)))
    : lowestPrice;
  const aggregateRating = reviewSummary && reviewSummary.reviewCount > 0
    ? {
        "@type": "AggregateRating",
        ratingValue: reviewSummary.ratingValue,
        reviewCount: reviewSummary.reviewCount,
        bestRating: reviewSummary.bestRating ?? 5,
        worstRating: reviewSummary.worstRating ?? 1,
      }
    : undefined;

  // Schema.org TouristAttraction with Product offer
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: tour.name,
    description: tour.description || tour.shortDescription,
    image: tour.coverImageUrl || undefined,
    url: tourUrl,

    // Location/Meeting Point
    ...(tour.meetingPoint && {
      location: {
        "@type": "Place",
        name: tour.meetingPoint,
        ...(tour.meetingPointLat &&
          tour.meetingPointLng && {
            geo: {
              "@type": "GeoCoordinates",
              latitude: parseFloat(tour.meetingPointLat),
              longitude: parseFloat(tour.meetingPointLng),
            },
          }),
      },
    }),

    // Provider (the tour operator)
    provider: {
      "@type": "TourOperator",
      name: org.name,
      ...(org.email && { email: org.email }),
      ...(org.phone && { telephone: org.phone }),
      url: organizationUrl,
      ...(org.address && {
        address: {
          "@type": "PostalAddress",
          streetAddress: org.address,
          addressLocality: org.city,
          addressRegion: org.state,
          postalCode: org.postalCode,
          addressCountry: org.country,
        },
      }),
    },

    // Offer (pricing)
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: currency,
      lowPrice: lowestPrice,
      highPrice: highestPrice,
      offerCount: pricingTiers.length || 1,
      availability: tour.status === "active" && tour.isPublic
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    ...(aggregateRating && {
      aggregateRating,
    }),

    // Duration
    ...(tour.durationMinutes && {
      duration: `PT${Math.floor(tour.durationMinutes / 60)}H${tour.durationMinutes % 60}M`,
    }),

    // Category
    ...(tour.category && {
      touristType: tour.category,
    }),
  };

  // Also add Product schema for better e-commerce results
  const productData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tour.name,
    description: tour.description || tour.shortDescription,
    image: tour.coverImageUrl || undefined,
    url: tourUrl,
    brand: {
      "@type": "Brand",
      name: org.name,
    },
    offers: (
      pricingTiers.length > 0
        ? pricingTiers.map((tier) => ({
            "@type": "Offer",
            name: tier.label,
            price: tier.price,
            priceCurrency: currency,
            availability: tour.status === "active" && tour.isPublic
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          }))
        : [
            {
              "@type": "Offer",
              name: tour.name,
              price: lowestPrice.toFixed(2),
              priceCurrency: currency,
              availability: tour.status === "active" && tour.isPublic
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          ]
    ),
    ...(aggregateRating && {
      aggregateRating,
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productData) }}
      />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <BreadcrumbStructuredData items={breadcrumbs} baseUrl={orgBaseUrl} />
      )}
      {faqs && faqs.length > 0 && <FAQStructuredData items={faqs} />}
    </>
  );
}

/**
 * Organization structured data for the entire booking site
 */
export function OrganizationStructuredData({
  org,
  baseUrl,
}: {
  org: Organization;
  baseUrl?: string;
}) {
  const organizationUrl = org.website || getCanonicalBaseUrl(org, baseUrl);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TourOperator",
    name: org.name,
    url: organizationUrl,
    ...(org.logoUrl && { logo: org.logoUrl }),
    ...(org.email && { email: org.email }),
    ...(org.phone && { telephone: org.phone }),
    ...(org.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: org.address,
        addressLocality: org.city,
        addressRegion: org.state,
        postalCode: org.postalCode,
        addressCountry: org.country,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * BreadcrumbList structured data
 */
export function BreadcrumbStructuredData({
  items,
  baseUrl,
}: {
  items: BreadcrumbItem[];
  baseUrl?: string;
}) {
  if (!items || items.length === 0) {
    return null;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: baseUrl ? toAbsoluteUrl(item.url, baseUrl) : item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * ItemList structured data for category hub pages.
 * Helps Google understand a list of tours within a category.
 */
export function TourCategoryStructuredData({
  categoryTitle,
  categoryDescription,
  categoryUrl,
  tours,
  org,
}: {
  categoryTitle: string;
  categoryDescription: string;
  categoryUrl: string;
  tours: Array<{ name: string; slug: string; coverImageUrl: string | null }>;
  org: Organization;
}) {
  const orgBaseUrl = normalizeBaseUrl(getOrganizationBookingUrl(org));

  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: categoryTitle,
    description: categoryDescription,
    url: categoryUrl,
    itemListElement: tours.map((tour, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tour.name,
      url: `${orgBaseUrl}/tours/${tour.slug}`,
      image: tour.coverImageUrl || undefined,
    })),
  };

  const touristAttractionData = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: categoryTitle,
    description: categoryDescription,
    url: categoryUrl,
    provider: {
      "@type": "TourOperator",
      name: org.name,
      url: org.website || orgBaseUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(touristAttractionData) }}
      />
    </>
  );
}

/**
 * FAQPage structured data
 */
export function FAQStructuredData({ items }: { items: FAQItem[] }) {
  if (!items || items.length === 0) {
    return null;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
