import type { Metadata } from "next";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { requireOrganization } from "@/lib/organization";
import { createServices } from "@tour/services";
import { TourCard } from "@/components/tour-card";
import { TourFilters } from "@/components/tour-filters";
import { TrustBar } from "@/components/trust-bar";
import { PageShell, Section, SectionHeader, HeroSection } from "@/components/layout";
import { FadeIn, StaggerChildren } from "@/components/layout/animate";
import { Button } from "@tour/ui";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    category?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Tours & Experiences | ${org.name}`,
    description: `Discover and book amazing tours and experiences with ${org.name}. Browse our selection of unique adventures.`,
    openGraph: {
      title: `Tours & Experiences | ${org.name}`,
      description: `Discover and book amazing tours and experiences with ${org.name}.`,
      type: "website",
    },
  };
}

export default async function ToursPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { category, sort, page: pageParam } = await searchParams;

  const org = await requireOrganization(slug);
  const services = createServices({ organizationId: org.id });

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const sortField = sort === "price" ? "basePrice" : "createdAt";
  const sortDirection = sort === "price-desc" ? "desc" : sort === "newest" ? "desc" : "asc";
  const currency = org.settings?.defaultCurrency || "USD";

  const [toursResult, categories, reviewStats, yearBookingStats, weekBookingStats] = await Promise.all([
    services.tour.getAll(
      {
        status: "active",
        isPublic: true,
        category: category || undefined,
      },
      { page, limit: 12 },
      { field: sortField as "basePrice" | "createdAt", direction: sortDirection }
    ),
    services.tour.getCategories(),
    services.review.getStats().catch(() => ({
      totalReviews: 0,
      averageRating: 4.8,
      averageTourRating: null,
      averageGuideRating: null,
      averageValueRating: null,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pendingReviews: 0,
      publicTestimonials: 0,
    })),
    services.analytics.getBookingStats({
      from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      to: new Date(),
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
    services.analytics.getBookingStats({
      from: addDays(new Date(), -7),
      to: new Date(),
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

  const { data: tours, total, totalPages, hasMore } = toursResult;
  const weeklyBookingsByTour = new Map(
    weekBookingStats.bookingsByTour.map((item) => [item.tourId, item.bookingCount])
  );
  const tomorrowKey = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const availabilityLabels = new Map<string, string | null>();
  await Promise.all(
    tours.map(async (tour) => {
      try {
        const currentMonth = await services.tourAvailability.getAvailableDatesForMonth(
          tour.id,
          new Date().getFullYear(),
          new Date().getMonth() + 1
        );
        const firstAvailable = currentMonth.dates
          .filter((date) => !date.isBlackedOut)
          .find((date) => date.slots.some((slot) => slot.available));

        if (!firstAvailable) {
          availabilityLabels.set(tour.id, "Sold out this month");
          return;
        }

        const openSlots = firstAvailable.slots.filter((slot) => slot.available);
        const tightestCapacity = Math.min(...openSlots.map((slot) => slot.spotsRemaining));
        if (tightestCapacity <= 4) {
          availabilityLabels.set(tour.id, `${tightestCapacity} spots left`);
          return;
        }

        if (firstAvailable.date === tomorrowKey) {
          availabilityLabels.set(tour.id, "Available tomorrow");
          return;
        }

        availabilityLabels.set(
          tour.id,
          `Next slot ${format(new Date(`${firstAvailable.date}T00:00:00`), "MMM d")}`
        );
      } catch {
        availabilityLabels.set(tour.id, null);
      }
    })
  );

  if (tours.length === 0 && page === 1) {
    return (
      <PageShell>
        <div className="py-20 text-center">
          <div className="mb-4 text-6xl">🔍</div>
          <h1 className="mb-2 text-2xl font-bold">No Tours Available</h1>
          <p className="text-muted-foreground">Check back soon for upcoming tours and experiences.</p>
        </div>
      </PageShell>
    );
  }

  const heroTour = tours[0] ?? null;
  const featuredTours = tours.slice(0, 6);
  const yearsOperating = Math.max(1, new Date().getFullYear() - new Date(org.createdAt).getFullYear());

  return (
    <PageShell className="pb-10 pt-6" contentClassName="space-y-8">
      <FadeIn>
        <HeroSection
          eyebrow="Direct Booking Experience"
          title="Explore premium tours built for unforgettable moments"
          subtitle={`Book in minutes with live availability, clear pricing, and instant confirmations directly with ${org.name}.`}
          imageUrl={heroTour?.coverImageUrl}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-xs text-amber-100 backdrop-blur">
            {tours.length} experiences ready to book
          </div>
        </HeroSection>
      </FadeIn>

      <FadeIn delayMs={90}>
        <TrustBar
          averageRating={reviewStats.averageRating || 4.8}
          totalGuests={yearBookingStats.totalParticipants || 1500}
          yearsOperating={yearsOperating}
          bookingsThisWeek={weekBookingStats.totalBookings}
        />
      </FadeIn>

      {featuredTours.length > 0 && (
        <Section spacing="compact" className="pt-0">
          <SectionHeader
            title="Featured This Week"
            subtitle="Handpicked experiences travelers are booking most right now"
          />
          <StaggerChildren className="hidden grid-cols-1 gap-6 md:grid md:grid-cols-3" stepMs={90}>
            {featuredTours.slice(0, 3).map((tour) => (
              <TourCard
                key={`featured-desktop-${tour.id}`}
                tour={tour}
                currency={currency}
                availabilityLabel={availabilityLabels.get(tour.id) || null}
                socialProofLabel={
                  weeklyBookingsByTour.get(tour.id)
                    ? `${weeklyBookingsByTour.get(tour.id)} booked this week`
                    : "Popular with returning guests"
                }
              />
            ))}
          </StaggerChildren>

          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:hidden">
            {featuredTours.map((tour) => (
              <div key={`featured-mobile-${tour.id}`} className="w-[88%] max-w-sm flex-none snap-start">
                <TourCard
                  tour={tour}
                  currency={currency}
                  availabilityLabel={availabilityLabels.get(tour.id) || null}
                  socialProofLabel={
                    weeklyBookingsByTour.get(tour.id)
                      ? `${weeklyBookingsByTour.get(tour.id)} booked this week`
                      : "Popular with returning guests"
                  }
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {categories.length > 0 && (
        <FadeIn delayMs={120}>
          <TourFilters categories={categories} selectedCategory={category} selectedSort={sort} />
        </FadeIn>
      )}

      <Section spacing="compact" className="pt-0">
        <SectionHeader
          title="All Tours"
          subtitle="Browse departures, compare options, and reserve instantly"
          action={
            <p className="text-xs text-muted-foreground">
              Showing {tours.length} of {total} tours
            </p>
          }
        />

        <StaggerChildren className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" stepMs={60}>
          {tours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              currency={currency}
              availabilityLabel={availabilityLabels.get(tour.id) || null}
              socialProofLabel={
                weeklyBookingsByTour.get(tour.id)
                  ? `${weeklyBookingsByTour.get(tour.id)} booked this week`
                  : "New dates available"
              }
            />
          ))}
        </StaggerChildren>
      </Section>

      {totalPages > 1 && (
        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}${category ? `&category=${category}` : ""}${sort ? `&sort=${sort}` : ""}`}
                className="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {hasMore && (
              <Link
                href={`?page=${page + 1}${category ? `&category=${category}` : ""}${sort ? `&sort=${sort}` : ""}`}
                className="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
              >
                Next
              </Link>
            )}
          </div>

          {hasMore && (
            <Button asChild variant="outline" className="sm:hidden">
              <Link href={`?page=${page + 1}${category ? `&category=${category}` : ""}${sort ? `&sort=${sort}` : ""}`}>
                Load More Tours
              </Link>
            </Button>
          )}
        </div>
      )}
    </PageShell>
  );
}
