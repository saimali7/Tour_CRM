import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/organization";
import { createServices, logger } from "@tour/services";
import { Clock, Users, MapPin, Check, X, Info, Calendar, Shield, Sparkles } from "lucide-react";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { TourStructuredData } from "@/components/structured-data";
import { ImageGallery } from "@/components/image-gallery";
import { ReviewSection } from "@/components/review-section";
import { TourCard } from "@/components/tour-card";
import { MobileBookingBar } from "@/components/mobile-booking-bar";
import { Breadcrumb, CardSurface, PageShell, SectionHeader } from "@/components/layout";
import { FadeIn } from "@/components/layout/animate";
import { getCategoryConfigByDbCategory } from "@/lib/category-config";

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
      description:
        tour.metaDescription ||
        tour.shortDescription ||
        tour.description?.slice(0, 160) ||
        `Book ${tour.name} with ${org.name}. Live availability, secure checkout, and instant confirmation.`,
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

  if (tour.status !== "active" || !tour.isPublic) {
    notFound();
  }

  const pricingTiers = await services.tour.getPricingTiers(tour.id);
  const activeTiers = pricingTiers.filter((tier) => tier.isActive);

  const now = new Date();

  const [
    currentMonthAvailability,
    reviewStats,
    recentReviews,
    similarToursResult,
    weeklyBookingStats,
  ] = await Promise.all([
    services.tourAvailability.getAvailableDatesForMonth(
      tour.id,
      now.getFullYear(),
      now.getMonth() + 1
    ),
    services.review.getStats({ tourId: tour.id }).catch(() => ({
      totalReviews: 0,
      averageRating: 4.8,
      averageTourRating: null,
      averageGuideRating: null,
      averageValueRating: null,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pendingReviews: 0,
      publicTestimonials: 0,
    })),
    services.review.getRecentForTour(tour.id, 6).catch(() => []),
    services.tour.getAll(
      {
        status: "active",
        isPublic: true,
        category: tour.category || undefined,
      },
      { page: 1, limit: 8 },
      { field: "createdAt", direction: "desc" }
    ),
    services.analytics.getBookingStats({
      from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: now,
    }).catch(() => ({
      totalBookings: 0,
      totalParticipants: 0,
      averagePartySize: 0,
      averageLeadTime: 0,
      cancellationRate: 0,
      noShowRate: 0,
      bookingsByTour: [],
      bookingsBySource: [],
    })),
  ]);

  const availableDates = currentMonthAvailability.dates;
  const currency = org.settings?.defaultCurrency || "USD";
  const weeklyBookings =
    weeklyBookingStats.bookingsByTour.find((item) => item.tourId === tour.id)?.bookingCount || 0;
  const similarTours = similarToursResult.data
    .filter((candidate) => candidate.id !== tour.id)
    .slice(0, 4);

  const images = [tour.coverImageUrl, ...(tour.images || [])].filter(Boolean) as string[];
  const basePriceLabel = formatPrice(tour.basePrice, currency);

  return (
    <>
      <TourStructuredData tour={tour} org={org} pricingTiers={activeTiers} />

      <PageShell className="pb-24 sm:pb-10">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            ...(tour.category
              ? (() => {
                  const catConfig = getCategoryConfigByDbCategory(tour.category);
                  return catConfig
                    ? [{ label: catConfig.label, href: `/experiences/${catConfig.slug}` }]
                    : [{ label: "Tours", href: "/" }];
                })()
              : [{ label: "Tours", href: "/" }]),
            { label: tour.name },
          ]}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            <FadeIn>
              <ImageGallery images={images} title={tour.name} />
            </FadeIn>

            <FadeIn delayMs={90}>
              <section>
                {tour.category && (
                  <span className="mb-3 inline-block rounded-full border border-border bg-secondary px-3 py-1 text-sm font-medium text-foreground">
                    {tour.category}
                  </span>
                )}
                {weeklyBookings > 0 && (
                  <p className="mb-2 inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-amber-600" />
                    {weeklyBookings} bookings this week
                  </p>
                )}
                <h1 className="mb-4 text-3xl font-bold md:text-4xl">{tour.name}</h1>

                <div className="mb-6 flex flex-wrap gap-4 text-muted-foreground">
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

                {tour.description && (
                  <div className="prose prose-neutral max-w-none text-muted-foreground">
                    <p className="whitespace-pre-wrap leading-relaxed">{tour.description}</p>
                  </div>
                )}
              </section>
            </FadeIn>

            {/* Trust Stack - Elevated for immediate visibility */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-2">
              {tour.cancellationPolicy && (
                <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-emerald-50/30 p-4">
                  <Shield className="mt-0.5 h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">Cancellation Policy</h3>
                    {tour.cancellationHours ? (
                      <p className="text-xs text-muted-foreground">Free cancellation up to {tour.cancellationHours} hours before the tour starts.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{tour.cancellationPolicy}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-secondary/20 p-4">
                <Calendar className="mt-0.5 h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-1">Instant Booking</h3>
                  <p className="text-xs text-muted-foreground">Your booking is confirmed immediately after payment.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {tour.includes && tour.includes.length > 0 && (
                <CardSurface>
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <Check className="h-5 w-5 text-green-500" />
                    What&apos;s Included
                  </h2>
                  <ul className="space-y-2">
                    {tour.includes.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardSurface>
              )}

              {tour.excludes && tour.excludes.length > 0 && (
                <CardSurface>
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <X className="h-5 w-5 text-red-500" />
                    What&apos;s Not Included
                  </h2>
                  <ul className="space-y-2">
                    {tour.excludes.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardSurface>
              )}
            </div>

            {tour.requirements && tour.requirements.length > 0 && (
              <CardSurface>
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Info className="h-5 w-5 text-blue-500" />
                  Requirements
                </h2>
                <ul className="space-y-2">
                  {tour.requirements.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardSurface>
            )}

            {tour.accessibility && (
              <CardSurface>
                <h2 className="mb-3 font-semibold">Accessibility</h2>
                <p className="text-sm text-muted-foreground">{tour.accessibility}</p>
              </CardSurface>
            )}

            {(tour.meetingPoint || tour.meetingPointDetails) && (
              <CardSurface>
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <MapPin className="h-5 w-5" />
                  Meeting Point
                </h2>
                {tour.meetingPoint && <p className="mb-2 font-medium">{tour.meetingPoint}</p>}
                {tour.meetingPointDetails && (
                  <p className="text-sm text-muted-foreground">{tour.meetingPointDetails}</p>
                )}
                {tour.meetingPointLat && tour.meetingPointLng && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${tour.meetingPointLat},${tour.meetingPointLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm text-primary hover:underline"
                  >
                    View on Google Maps →
                  </a>
                )}
              </CardSurface>
            )}

            {tour.cancellationPolicy && (
              <CardSurface>
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Shield className="h-5 w-5" />
                  Cancellation Policy
                </h2>
                <p className="text-sm text-muted-foreground">{tour.cancellationPolicy}</p>
                {tour.cancellationHours && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Free cancellation up to {tour.cancellationHours} hours before the tour.
                  </p>
                )}
              </CardSurface>
            )}

            <ReviewSection
              averageRating={reviewStats.averageRating || 4.8}
              totalReviews={reviewStats.totalReviews || 0}
              reviews={recentReviews}
            />

            {similarTours.length > 0 && (
              <section className="space-y-4 pt-8 border-t border-border/40">
                <SectionHeader
                  title="You Might Also Love"
                  subtitle="Similar experiences in this collection"
                />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {similarTours.slice(0, 4).map((similarTour) => (
                    <TourCard
                      key={`similar-desktop-${similarTour.id}`}
                      tour={similarTour}
                      currency={currency}
                      socialProofLabel="Recommended by recent guests"
                    />
                  ))}
                </div>
                <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 md:hidden">
                  {similarTours.map((similarTour) => (
                    <div key={`similar-mobile-${similarTour.id}`} className="w-[85%] max-w-sm flex-none snap-start">
                      <TourCard
                        tour={similarTour}
                        currency={currency}
                        socialProofLabel="Recommended by recent guests"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sticky Booking Widget Column */}
          <aside className="lg:col-span-4 hidden lg:block relative">
            <div className="sticky top-28 space-y-6">
              <CardSurface className="shadow-lg border-border/50 bg-card/95 backdrop-blur overflow-hidden rounded-2xl">
                <div className="bg-surface-dark text-surface-dark-foreground p-5 -mx-6 -mt-6 mb-6">
                  <p className="text-xs uppercase tracking-wider text-amber-200/80 mb-1 font-medium text-center">Price starting from</p>
                  <p className="text-4xl font-bold text-center leading-none">{basePriceLabel}</p>
                </div>

                <div className="px-1 text-center">
                  <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 mx-auto">
                    <Sparkles className="h-3.5 w-3.5" />
                    {weeklyBookings > 0
                      ? `${weeklyBookings} people booked this week`
                      : "Popular departure times fill up quickly"}
                  </p>
                </div>

                {activeTiers.length > 0 && (
                  <div className="mb-6 space-y-2 border-t border-border/40 pt-4 px-1">
                    {activeTiers.map((tier) => (
                      <div key={tier.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">
                          {tier.label}
                          {tier.minAge !== null && tier.maxAge !== null && (
                            <span className="ml-1 text-xs opacity-80">({tier.minAge}-{tier.maxAge})</span>
                          )}
                        </span>
                        <span className="font-semibold">{formatPrice(tier.price, currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 border-t border-border/40 pt-4 px-1 bg-secondary/30 rounded-xl p-4 mt-2">
                  <div className="flex items-center gap-3 text-sm text-foreground font-medium">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100"><Shield className="h-3 w-3 text-green-600" /></div>
                    <span>Secure Payment Checkout</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground font-medium">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100"><Calendar className="h-3 w-3 text-blue-600" /></div>
                    <span>Instant Ticket Confirmation</span>
                  </div>
                </div>
              </CardSurface>

              <CardSurface className="shadow-lg border-border/50 bg-card rounded-2xl" id="availability">
                <h2 className="mb-4 flex items-center gap-2 font-semibold text-lg border-b border-border/40 pb-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  Select Date
                </h2>
                <AvailabilityCalendar
                  availableDates={availableDates}
                  currency={currency}
                  tourId={tour.id}
                  organizationSlug={slug}
                  tourSlug={tourSlug}
                  initialYear={currentMonthAvailability.year}
                  initialMonth={currentMonthAvailability.month}
                />
              </CardSurface>
            </div>
          </aside>

          {/* Mobile Calendar (appears in flow on small screens) */}
          <div className="lg:hidden mt-8" id="availability-mobile">
            <CardSurface className="shadow-sm border-border/50 bg-card rounded-2xl">
              <h2 className="mb-4 flex items-center gap-2 font-semibold border-b border-border/40 pb-3">
                <Calendar className="h-5 w-5 text-primary" />
                Select Date
              </h2>
              <AvailabilityCalendar
                availableDates={availableDates}
                currency={currency}
                tourId={tour.id}
                organizationSlug={slug}
                tourSlug={tourSlug}
                initialYear={currentMonthAvailability.year}
                initialMonth={currentMonthAvailability.month}
              />
            </CardSurface>
          </div>
        </div>
      </PageShell>

      <MobileBookingBar priceLabel={basePriceLabel} />
    </>
  );
}
