import type { Tour, Organization, TourPricingTier } from "@tour/database";

interface TourStructuredDataProps {
  tour: Tour;
  org: Organization;
  pricingTiers: TourPricingTier[];
}

/**
 * Generates Schema.org structured data for tours.
 * This helps search engines understand the content and can enable rich results.
 */
export function TourStructuredData({
  tour,
  org,
  pricingTiers,
}: TourStructuredDataProps) {
  const currency = org.settings?.defaultCurrency || "USD";
  const lowestPrice = pricingTiers.length > 0
    ? Math.min(...pricingTiers.map((t) => parseFloat(t.price)))
    : parseFloat(tour.basePrice);

  // Schema.org TouristAttraction with Product offer
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: tour.name,
    description: tour.description || tour.shortDescription,
    image: tour.coverImageUrl || undefined,
    url: `https://${org.slug}.book.tourplatform.com/tours/${tour.slug}`,

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
      ...(org.website && { url: org.website }),
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
      highPrice: pricingTiers.length > 0
        ? Math.max(...pricingTiers.map((t) => parseFloat(t.price)))
        : lowestPrice,
      offerCount: pricingTiers.length || 1,
      availability: tour.status === "active" && tour.isPublic
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },

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
    brand: {
      "@type": "Brand",
      name: org.name,
    },
    offers: pricingTiers.map((tier) => ({
      "@type": "Offer",
      name: tier.label,
      price: tier.price,
      priceCurrency: currency,
      availability: tour.status === "active" && tour.isPublic
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    })),
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
    </>
  );
}

/**
 * Organization structured data for the entire booking site
 */
export function OrganizationStructuredData({ org }: { org: Organization }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TourOperator",
    name: org.name,
    url: `https://${org.slug}.book.tourplatform.com`,
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
}: {
  items: { name: string; url: string }[];
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
