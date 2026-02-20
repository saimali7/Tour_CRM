import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { addDays, format } from "date-fns";
import { ArrowRight, Sparkles, CheckCircle2, Shield, Star } from "lucide-react";
import { requireOrganization } from "@/lib/organization";
import { createServices } from "@tour/services";
import { TourCard } from "@/components/tour-card";
import { TrustBar } from "@/components/trust-bar";
import { TripInspirationSection } from "@/components/trip-inspiration-section";
import { PageShell, Section, SectionHeader, HeroSection } from "@/components/layout";
import { FadeIn, StaggerChildren } from "@/components/layout/animate";
import { OrganizationStructuredData } from "@/components/structured-data";
import { getOrganizationBookingUrl } from "@/lib/organization";
import { CATEGORY_CONFIGS } from "@/lib/category-config";
import { Button } from "@tour/ui";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Tours & Experiences | ${org.name}`,
    description: `Discover and book amazing tours and experiences with ${org.name}. Desert safaris, city tours, water sports & private tours. Instant booking, free cancellation.`,
    openGraph: {
      title: `Tours & Experiences | ${org.name}`,
      description: `Discover and book amazing tours and experiences with ${org.name}.`,
      type: "website",
    },
  };
}

export default async function DiscoveryPage({ params }: PageProps) {
  const { slug } = await params;

  const org = await requireOrganization(slug);
  const services = createServices({ organizationId: org.id });
  const currency = org.settings?.defaultCurrency || "USD";
  const baseUrl = getOrganizationBookingUrl(org).replace(/\/$/, "");

  /* ── Parallel data fetching ──────────────────────────────────────────── */
  const [featuredToursResult, reviewStats, recentReviews, yearBookingStats, weekBookingStats] =
    await Promise.all([
      services.tour.getAll(
        { status: "active", isPublic: true },
        { page: 1, limit: 6 },
        { field: "createdAt", direction: "desc" }
      ),
      services.review.getStats().catch(() => ({
        totalReviews: 0,
        averageRating: 4.9,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        pendingReviews: 0,
        publicTestimonials: 0,
      })),
      services.review.getPublicTestimonials(3).catch(() => []),
      services.analytics.getBookingStats({
        from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        to: new Date(),
      }).catch(() => ({ totalBookings: 0, totalParticipants: 0, bookingsByTour: [] })),
      services.analytics.getBookingStats({
        from: addDays(new Date(), -7),
        to: new Date(),
      }).catch(() => ({ totalBookings: 0, totalParticipants: 0, bookingsByTour: [] })),
    ]);

  const featuredTours = featuredToursResult.data;
  const heroTour = featuredTours[0] ?? null;
  const yearsOperating = Math.max(
    1,
    new Date().getFullYear() - new Date(org.createdAt).getFullYear()
  );

  const weeklyBookingsByTour = new Map(
    (weekBookingStats.bookingsByTour ?? []).map((item) => [item.tourId, item.bookingCount])
  );

  /* Availability labels for featured tours */
  const tomorrowKey = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const availabilityLabels = new Map<string, string | null>();
  await Promise.all(
    featuredTours.map(async (tour) => {
      try {
        const monthData = await services.tourAvailability.getAvailableDatesForMonth(
          tour.id,
          new Date().getFullYear(),
          new Date().getMonth() + 1
        );
        const firstAvailable = monthData.dates
          .filter((d) => !d.isBlackedOut)
          .find((d) => d.slots.some((s) => s.available));
        if (!firstAvailable) {
          availabilityLabels.set(tour.id, "Sold out this month");
          return;
        }
        const openSlots = firstAvailable.slots.filter((s) => s.available);
        const tightest = Math.min(...openSlots.map((s) => s.spotsRemaining));
        if (tightest <= 4) {
          availabilityLabels.set(tour.id, `${tightest} spots left`);
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

  const recentReviewItems = Array.isArray(recentReviews) ? recentReviews : [];

  return (
    <>
      <OrganizationStructuredData org={org} baseUrl={baseUrl} />

      <div className="pb-20 pt-0">
        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <FadeIn>
          <HeroSection
            eyebrow="Book Directly — No Commission, No Middlemen"
            title={`Extraordinary Dubai.\nUnforgettable memories.`}
            subtitle={`Book desert safaris, city tours & water adventures directly with ${org.name} — local experts with instant confirmation.`}
            imageUrl={heroTour?.coverImageUrl}
          >
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#experiences"
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-5 py-2.5 text-sm font-semibold text-foreground shadow-md transition-all hover:bg-white hover:scale-[1.02]"
              >
                Browse Experiences
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#featured"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                Featured This Week
              </a>
            </div>
          </HeroSection>
        </FadeIn>

        {/* ── TRUST BAR ───────────────────────────────────────────────────── */}
        <FadeIn delayMs={90}>
          <TrustBar
            averageRating={reviewStats.averageRating || 4.9}
            totalGuests={yearBookingStats.totalParticipants || 1500}
            yearsOperating={yearsOperating}
            bookingsThisWeek={weekBookingStats.totalBookings}
          />
        </FadeIn>

        {/* ── CATEGORY GRID ───────────────────────────────────────────────── */}
        <Section
          id="experiences"
          spacing="spacious"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20"
        >
          <FadeIn delayMs={120}>
            <SectionHeader
              title="What kind of adventure are you after?"
              subtitle="Pick a category and explore experiences built for every traveller"
              align="center"
            />
          </FadeIn>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_CONFIGS.map((cat, index) => (
              <FadeIn key={cat.slug} delayMs={120 + index * 60}>
                <Link
                  href={`/experiences/${cat.slug}`}
                  className="group relative flex min-h-[220px] sm:min-h-[260px] flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Background image */}
                  <Image
                    src={cat.heroImageUrl}
                    alt={cat.label}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  {/* Content */}
                  <div className="relative mt-auto p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                      Explore
                    </p>
                    <h3 className="mt-1 font-display text-xl font-bold text-white leading-tight">
                      {cat.label}
                    </h3>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition-colors group-hover:bg-white/25">
                      View experiences
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </Section>

        {/* ── TRIP INSPIRATION ─────────────────────────────────────────────── */}
        <TripInspirationSection orgName={org.name} />

        {/* ── FEATURED THIS WEEK ──────────────────────────────────────────── */}
        {featuredTours.length > 0 && (
          <div className="border-y border-border bg-accent/20 py-16 sm:py-20" id="featured">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <FadeIn>
                <SectionHeader
                  title="Featured This Week"
                  subtitle="Handpicked experiences travellers are booking most right now"
                  action={
                    <Button asChild variant="outline" size="sm" className="hidden sm:flex">
                      <Link href="/" className="inline-flex items-center gap-1.5">
                        View all
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  }
                />
              </FadeIn>

              {/* Scrollable rail */}
              <div className="-mx-4 flex snap-x snap-mandatory gap-4 sm:gap-6 overflow-x-auto px-4 sm:px-0 pb-4 pt-2 scrollbar-hide">
                {featuredTours.map((tour) => (
                  <div
                    key={tour.id}
                    className="w-[85%] sm:w-[320px] lg:w-[360px] flex-none snap-start"
                  >
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
            </div>
          </div>
        )}

        {/* ── WHY BOOK DIRECT ─────────────────────────────────────────────── */}
        <Section spacing="spacious" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <SectionHeader
              title="Why Book Directly With Us"
              subtitle="Skip the booking platforms. Get the best price, the fastest confirmation, and full support from real people."
              align="center"
            />
          </FadeIn>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                icon: CheckCircle2,
                color: "bg-emerald-100 text-emerald-700",
                title: "No Commission. Best Price.",
                body: "Booking directly means no third-party platform fees. You pay the same price — sometimes less — and 100% goes to your local operator.",
              },
              {
                icon: Sparkles,
                color: "bg-amber-100 text-amber-700",
                title: "Instant Confirmation",
                body: "Book now and receive your confirmation email immediately. No wait, no callbacks — your spot is secured the moment payment goes through.",
              },
              {
                icon: Shield,
                color: "bg-sky-100 text-sky-700",
                title: "Real Local Experts",
                body: "Our guides are certified locals with years of on-the-ground experience. They know every hidden gem, shortcut, and story the guidebooks miss.",
              },
            ].map(({ icon: Icon, color, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── REVIEWS ─────────────────────────────────────────────────────── */}
        {recentReviewItems.length > 0 && (
          <div className="border-t border-border bg-surface-soft py-16 sm:py-20">
            <PageShell>
              <FadeIn>
                <SectionHeader
                  title="What Our Guests Say"
                  subtitle={`${reviewStats.totalReviews || 0} verified reviews · ${(reviewStats.averageRating || 4.9).toFixed(1)} average`}
                  align="center"
                />
              </FadeIn>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StaggerChildren className="contents" stepMs={80}>
                  {recentReviewItems.slice(0, 3).map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </StaggerChildren>
              </div>
            </PageShell>
          </div>
        )}

        {/* ── FINAL CTA BAND ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-surface-dark py-20 text-surface-dark-foreground">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
          <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              Your adventure starts here
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              Ready to explore Dubai?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/80">
              Browse our full collection of experiences. Live availability, secure checkout, instant confirmation.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#experiences"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-foreground shadow-md transition-all hover:bg-white/90 hover:scale-[1.02]"
              >
                Browse Experiences
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Inline review card ──────────────────────────────────────────────────── */

function ReviewCard({
  review,
}: {
  review: {
    id: string;
    overallRating: number;
    comment: string | null;
    createdAt: Date;
    customer?: { firstName: string; lastName: string } | null;
  };
}) {
  const firstName = review.customer?.firstName?.trim() || "Guest";
  const lastName = review.customer?.lastName?.trim() || "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "G";
  const displayName = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;
  const rating = Math.max(1, Math.min(5, Math.round(review.overallRating)));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-3 flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        ))}
      </div>
      {review.comment && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-4">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold">{displayName}</p>
          <p className="text-xs text-muted-foreground">Verified guest</p>
        </div>
      </div>
    </div>
  );
}
