import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { requireOrganization } from "@/lib/organization";
import { createServices, logger } from "@tour/services";
import { Clock, Users, MapPin, Check, X, Info, Calendar, Shield } from "lucide-react";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { TourStructuredData } from "@/components/structured-data";

interface PageProps {
  params: Promise<{ slug: string; tourSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, tourSlug } = await params;
  const org = await requireOrganization(slug);
  const services = createServices({ organizationId: org.id });

  try {
    const tour = await services.tour.getBySlug(tourSlug);

    return {
      title: tour.metaTitle || `${tour.name} | ${org.name}`,
      description: tour.metaDescription || tour.shortDescription || tour.description?.slice(0, 160),
      openGraph: {
        title: tour.metaTitle || `${tour.name} | ${org.name}`,
        description: tour.metaDescription || tour.shortDescription || undefined,
        images: tour.coverImageUrl ? [{ url: tour.coverImageUrl }] : undefined,
        type: "website",
      },
    };
  } catch (error) {
    logger.debug({ err: error, tourSlug, orgSlug: slug }, "Tour not found for metadata generation");
    return {
      title: "Tour Not Found",
    };
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

function formatPrice(price: string | number, currency: string): string {
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericPrice);
}

export default async function TourDetailPage({ params }: PageProps) {
  const { slug, tourSlug } = await params;
  const org = await requireOrganization(slug);
  const services = createServices({ organizationId: org.id });

  let tour;
  try {
    tour = await services.tour.getBySlug(tourSlug);
  } catch (error) {
    logger.debug({ err: error, tourSlug, orgSlug: slug }, "Tour not found for tour detail page");
    notFound();
  }

  // Only show active, public tours
  if (tour.status !== "active" || !tour.isPublic) {
    notFound();
  }

  // Get pricing tiers for this tour
  const pricingTiers = await services.tour.getPricingTiers(tour.id);
  const activeTiers = pricingTiers.filter((tier) => tier.isActive);

  // Get available schedules for the next 90 days
  const dateRange = {
    from: new Date(),
    to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  };
  const availableSchedules = await services.schedule.getAvailableForTour(
    tour.id,
    dateRange
  );

  const currency = org.settings?.defaultCurrency || "USD";

  // Gallery images
  const images = [tour.coverImageUrl, ...(tour.images || [])].filter(Boolean) as string[];

  return (
    <>
      <TourStructuredData tour={tour} org={org} pricingTiers={activeTiers} />

      <div className="container px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <a href="/" className="hover:text-primary">
            Tours
          </a>
          <span className="mx-2">/</span>
          <span>{tour.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-muted">
                {tour.coverImageUrl ? (
                  <Image
                    src={tour.coverImageUrl}
                    alt={tour.name}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 66vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-6xl">
                    🗺️
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.slice(0, 4).map((image, index) => (
                    <div
                      key={index}
                      className="relative aspect-[4/3] rounded-md overflow-hidden bg-muted"
                    >
                      <Image
                        src={image}
                        alt={`${tour.name} - Image ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 25vw, 16vw"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tour Info */}
            <div>
              {tour.category && (
                <span className="inline-block px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full mb-3">
                  {tour.category}
                </span>
              )}
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{tour.name}</h1>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-4 text-muted-foreground mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{formatDuration(tour.durationMinutes)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>Up to {tour.maxParticipants} people</span>
                </div>
                {tour.meetingPoint && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span>{tour.meetingPoint}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {tour.description && (
                <div className="prose prose-neutral max-w-none">
                  <p className="whitespace-pre-wrap">{tour.description}</p>
                </div>
              )}
            </div>

            {/* What's Included / Excluded */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tour.includes && tour.includes.length > 0 && (
                <div className="p-6 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    What&apos;s Included
                  </h3>
                  <ul className="space-y-2">
                    {tour.includes.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tour.excludes && tour.excludes.length > 0 && (
                <div className="p-6 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <X className="h-5 w-5 text-red-500" />
                    What&apos;s Not Included
                  </h3>
                  <ul className="space-y-2">
                    {tour.excludes.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Requirements */}
            {tour.requirements && tour.requirements.length > 0 && (
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Requirements
                </h3>
                <ul className="space-y-2">
                  {tour.requirements.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Accessibility */}
            {tour.accessibility && (
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-4">Accessibility</h3>
                <p className="text-sm text-muted-foreground">{tour.accessibility}</p>
              </div>
            )}

            {/* Meeting Point */}
            {(tour.meetingPoint || tour.meetingPointDetails) && (
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Meeting Point
                </h3>
                {tour.meetingPoint && (
                  <p className="font-medium mb-2">{tour.meetingPoint}</p>
                )}
                {tour.meetingPointDetails && (
                  <p className="text-sm text-muted-foreground">
                    {tour.meetingPointDetails}
                  </p>
                )}
                {tour.meetingPointLat && tour.meetingPointLng && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${tour.meetingPointLat},${tour.meetingPointLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm text-primary hover:underline"
                  >
                    View on Google Maps →
                  </a>
                )}
              </div>
            )}

            {/* Cancellation Policy */}
            {tour.cancellationPolicy && (
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Cancellation Policy
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tour.cancellationPolicy}
                </p>
                {tour.cancellationHours && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Free cancellation up to {tour.cancellationHours} hours before the
                    tour.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Price Card */}
              <div className="p-6 rounded-lg border bg-card shadow-sm">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="text-3xl font-bold">
                    {formatPrice(tour.basePrice, currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">per person</p>
                </div>

                {/* Pricing Tiers */}
                {activeTiers.length > 0 && (
                  <div className="space-y-2 mb-6 pt-4 border-t">
                    {activeTiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-muted-foreground">
                          {tier.label}
                          {tier.minAge !== null && tier.maxAge !== null && (
                            <span className="text-xs ml-1">
                              ({tier.minAge}-{tier.maxAge})
                            </span>
                          )}
                        </span>
                        <span className="font-medium">
                          {formatPrice(tier.price, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trust Badges */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span>Instant Confirmation</span>
                  </div>
                  {tour.cancellationHours && tour.cancellationHours >= 24 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Free Cancellation</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Availability Calendar */}
              <div className="p-6 rounded-lg border bg-card shadow-sm">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Check Availability
                </h3>
                <AvailabilityCalendar
                  schedules={availableSchedules}
                  currency={currency}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
