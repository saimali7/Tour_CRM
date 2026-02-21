import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/organization";
import { createServices, logger } from "@tour/services";
import { Clock, Users, MapPin, Check, X, Info, Calendar, Shield, Sparkles, Star, ArrowRight } from "lucide-react";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { TourStructuredData } from "@/components/structured-data";
import { ImageGallery } from "@/components/image-gallery";
import { ReviewSection } from "@/components/review-section";
import { TourCard } from "@/components/tour-card";
import { MobileBookingBar } from "@/components/mobile-booking-bar";
import { Breadcrumb, CardSurface, SectionHeader } from "@/components/layout";
import { getCategoryConfigByDbCategory } from "@/lib/category-config";
import { Button } from "@tour/ui";

interface PageProps {
  params: Promise<{ slug: string; tourSlug: string }>;
}

type TourGalleryMediaItem = {
  type: "image" | "short";
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
};

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
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours} hour${hours > 1 ? "s" : ""}` : `${hours}h ${rem}m`;
}

function formatPrice(price: string | number, currency: string): string {
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
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

  if (tour.status !== "active" || !tour.isPublic) notFound();

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
    services.tourAvailability.getAvailableDatesForMonth(tour.id, now.getFullYear(), now.getMonth() + 1),
    services.review.getStats({ tourId: tour.id }).catch(() => ({
      totalReviews: 0, averageRating: 4.8,
      averageTourRating: null, averageGuideRating: null, averageValueRating: null,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pendingReviews: 0, publicTestimonials: 0,
    })),
    services.review.getRecentForTour(tour.id, 6).catch(() => []),
    services.tour.getAll(
      { status: "active", isPublic: true, category: tour.category || undefined },
      { page: 1, limit: 8 },
      { field: "createdAt", direction: "desc" }
    ),
    services.analytics.getBookingStats({
      from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: now,
    }).catch(() => ({
      totalBookings: 0, totalParticipants: 0, averagePartySize: 0,
      averageLeadTime: 0, cancellationRate: 0, noShowRate: 0,
      bookingsByTour: [], bookingsBySource: [],
    })),
  ]);

  const availableDates = currentMonthAvailability.dates;
  const currency = org.settings?.defaultCurrency || "USD";
  const weeklyBookings = weeklyBookingStats.bookingsByTour.find((item) => item.tourId === tour.id)?.bookingCount || 0;
  const similarTours = similarToursResult.data.filter((c) => c.id !== tour.id).slice(0, 4);

  const media = (
    (tour.media as Array<{ type?: "image" | "short"; url?: string; thumbnailUrl?: string | null; title?: string | null }> | null) ?? []
  )
    .filter((item) => item?.url)
    .map<TourGalleryMediaItem>((item) => ({
      type: item.type === "short" ? "short" : "image",
      url: item.url!,
      thumbnailUrl: item.thumbnailUrl ?? null,
      title: item.title ?? null,
    }));
  const images = [tour.coverImageUrl, ...(tour.images || [])].filter(Boolean) as string[];
  const basePriceLabel = formatPrice(tour.basePrice, currency);
  const avgRating = reviewStats.averageRating || 4.8;
  const totalReviews = reviewStats.totalReviews || 0;

  return (
    <>
      <TourStructuredData tour={tour} org={org} pricingTiers={activeTiers} />

      <div className="pb-24 sm:pb-10">
        {/* Breadcrumb */}
        <div className="mx-auto px-[var(--page-gutter)] pt-6" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
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
        </div>

        {/* Title block */}
        <div className="mx-auto px-[var(--page-gutter)] mt-4 mb-6" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          {tour.category && (
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wide">
              {tour.category}
            </span>
          )}
          <h1 className="text-display mb-3">{tour.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {totalReviews > 0 && (
              <a href="#reviews" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                <span>({totalReviews} reviews)</span>
              </a>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatDuration(tour.durationMinutes)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Up to {tour.maxParticipants} guests
            </span>
            {tour.meetingPoint && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {tour.meetingPoint}
              </span>
            )}
          </div>
        </div>

        {/* Media Gallery */}
        <div className="mx-auto px-[var(--page-gutter)] mb-10" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <ImageGallery images={images} media={media} title={tour.name} />
        </div>

        {/* Two-column layout */}
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* LEFT COLUMN — Content */}
            <div className="space-y-10 lg:col-span-7">
              {/* About this activity */}
              <section>
                <h2 className="text-heading mb-4">About This Activity</h2>

                {/* Quick info pills */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { icon: Clock, label: "Duration", value: formatDuration(tour.durationMinutes) },
                    { icon: Users, label: "Group size", value: `Up to ${tour.maxParticipants}` },
                    ...(tour.cancellationHours ? [{ icon: Shield, label: "Cancellation", value: `Free up to ${tour.cancellationHours}h` }] : []),
                    ...(tour.meetingPoint ? [{ icon: MapPin, label: "Meeting point", value: tour.meetingPoint }] : []),
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-stone-50 p-3.5">
                      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {weeklyBookings > 0 && (
                  <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    {weeklyBookings} people booked this week — likely to sell out
                  </p>
                )}

                {tour.description && (
                  <div className="prose prose-stone max-w-none">
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">{tour.description}</p>
                  </div>
                )}
              </section>

              {/* Includes / Excludes */}
              {((tour.includes && tour.includes.length > 0) || (tour.excludes && tour.excludes.length > 0)) && (
                <section className="border-t border-border pt-10">
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {tour.includes && tour.includes.length > 0 && (
                      <div>
                        <h2 className="text-heading mb-4 flex items-center gap-2">
                          <Check className="h-5 w-5 text-emerald-500" />
                          What&apos;s Included
                        </h2>
                        <ul className="space-y-2.5">
                          {tour.includes.map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm">
                              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {tour.excludes && tour.excludes.length > 0 && (
                      <div>
                        <h2 className="text-heading mb-4 flex items-center gap-2">
                          <X className="h-5 w-5 text-red-400" />
                          Not Included
                        </h2>
                        <ul className="space-y-2.5">
                          {tour.excludes.map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                              <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Requirements */}
              {tour.requirements && tour.requirements.length > 0 && (
                <section className="border-t border-border pt-10">
                  <h2 className="text-heading mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    Important Information
                  </h2>
                  <ul className="space-y-2.5">
                    {tour.requirements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-stone-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Accessibility */}
              {tour.accessibility && (
                <section className="border-t border-border pt-10">
                  <h2 className="text-heading mb-3">Accessibility</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tour.accessibility}</p>
                </section>
              )}

              {/* Meeting Point */}
              {(tour.meetingPoint || tour.meetingPointDetails) && (
                <section className="border-t border-border pt-10">
                  <h2 className="text-heading mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Meeting Point
                  </h2>
                  {tour.meetingPoint && <p className="font-medium mb-1">{tour.meetingPoint}</p>}
                  {tour.meetingPointDetails && (
                    <p className="text-sm text-muted-foreground">{tour.meetingPointDetails}</p>
                  )}
                  {tour.meetingPointLat && tour.meetingPointLng && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${tour.meetingPointLat},${tour.meetingPointLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View on Google Maps
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </section>
              )}

              {/* Reviews */}
              <section id="reviews" className="border-t border-border pt-10">
                <ReviewSection
                  averageRating={avgRating}
                  totalReviews={totalReviews}
                  reviews={recentReviews}
                />
              </section>
            </div>

            {/* RIGHT COLUMN — Sticky booking widget */}
            <aside className="lg:col-span-5 hidden lg:block">
              <div className="sticky top-28 space-y-6">
                {/* Price card */}
                <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-lg)] overflow-hidden">
                  {/* Price header */}
                  <div className="bg-stone-950 text-white p-6">
                    <p className="text-xs uppercase tracking-[0.12em] text-stone-400 mb-1 text-center">From</p>
                    <p className="text-4xl font-bold text-center tracking-tight">{basePriceLabel}</p>
                    <p className="text-xs text-stone-400 text-center mt-1">per person</p>
                  </div>

                  <div className="p-6">
                    {weeklyBookings > 0 && (
                      <p className="mb-4 flex items-center justify-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                        <Sparkles className="h-3.5 w-3.5" />
                        {weeklyBookings} booked this week
                      </p>
                    )}

                    {activeTiers.length > 0 && (
                      <div className="mb-5 space-y-2.5 border-b border-border/40 pb-5">
                        {activeTiers.map((tier) => (
                          <div key={tier.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {tier.label}
                              {tier.minAge !== null && tier.maxAge !== null && (
                                <span className="ml-1 text-xs opacity-70">({tier.minAge}-{tier.maxAge})</span>
                              )}
                            </span>
                            <span className="font-semibold">{formatPrice(tier.price, currency)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      asChild
                      className="w-full h-12 rounded-xl bg-primary text-white text-base font-semibold shadow-[var(--shadow-glow)] transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <a href="#availability">
                        Check Availability
                        <Calendar className="ml-2 h-4 w-4" />
                      </a>
                    </Button>

                    {/* Trust signals */}
                    <div className="mt-5 space-y-2.5">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {tour.cancellationHours
                          ? `Free cancellation up to ${tour.cancellationHours}h before`
                          : "Secure payment checkout"}
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        Instant booking confirmation
                      </div>
                    </div>
                  </div>
                </div>

                {/* Availability calendar */}
                <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-md)] p-6" id="availability">
                  <h2 className="mb-4 flex items-center gap-2 text-heading border-b border-border/40 pb-3">
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
                </div>
              </div>
            </aside>

            {/* Mobile Calendar */}
            <div className="lg:hidden" id="availability-mobile">
              <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)] p-6">
                <h2 className="mb-4 flex items-center gap-2 text-heading border-b border-border/40 pb-3">
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
              </div>
            </div>
          </div>
        </div>

        {/* Similar tours */}
        {similarTours.length > 0 && (
          <div className="mx-auto px-[var(--page-gutter)] mt-16 pt-12 border-t border-border" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
            <SectionHeader
              eyebrow="More to explore"
              title="You Might Also Love"
              subtitle="Similar experiences in this collection"
            />
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-5">
              {similarTours.map((t) => (
                <TourCard key={t.id} tour={t} currency={currency} />
              ))}
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 md:hidden">
              {similarTours.map((t) => (
                <div key={t.id} className="w-[85%] max-w-sm flex-none snap-start">
                  <TourCard tour={t} currency={currency} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <MobileBookingBar priceLabel={basePriceLabel} />
    </>
  );
}
