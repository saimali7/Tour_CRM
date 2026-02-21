import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { addDays, format } from "date-fns";
import { ArrowRight, CheckCircle2, Shield, Sparkles, Star } from "lucide-react";
import { requireOrganization } from "@/lib/organization";
import { createServices } from "@tour/services";
import { TourCard } from "@/components/tour-card";
import { TrustBar } from "@/components/trust-bar";
import { TripInspirationSection } from "@/components/trip-inspiration-section";
import { Section, SectionHeader } from "@/components/layout";
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

  /* Availability labels */
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

      {/* ── HERO ── Full viewport, cinematic ─────────────────────────────── */}
      <section className="relative overflow-hidden min-h-screen flex flex-col justify-center bg-stone-950">
        {/* Background image */}
        {heroTour?.coverImageUrl && (
          <Image
            src={heroTour.coverImageUrl}
            alt={`${org.name} — Dubai tours and experiences`}
            fill
            className="object-cover opacity-40"
            quality={85}
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        <div
          className="relative z-10 w-full mx-auto px-[var(--page-gutter)] py-20"
          style={{ maxWidth: "var(--page-max-width, 1400px)" }}
        >
          <div className="max-w-2xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-primary animate-fade-in">
              Book Directly — No Commission
            </p>
            <h1 className="text-hero text-white drop-shadow-lg animate-slide-in">
              Discover Dubai&apos;s Greatest Adventures
            </h1>
            <p
              className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-white/80 animate-slide-in"
              style={{ animationDelay: "100ms" }}
            >
              Desert safaris, city tours & water adventures — book directly with {org.name} for instant confirmation and the best prices.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4 animate-slide-in" style={{ animationDelay: "200ms" }}>
              <Button
                asChild
                className="h-13 rounded-full bg-primary px-8 text-base font-semibold text-white shadow-[var(--shadow-glow)] transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
              >
                <a href="#tours" className="inline-flex items-center gap-2">
                  Browse Experiences
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <a
                href="#featured"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                Featured This Week
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-float hidden sm:block">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ─────────────────────────────────────────────── */}
      <TrustBar
        averageRating={reviewStats.averageRating || 4.9}
        totalGuests={yearBookingStats.totalParticipants || 1500}
        yearsOperating={yearsOperating}
        bookingsThisWeek={weekBookingStats.totalBookings}
      />

      {/* ── CATEGORY CARDS ───────────────────────────────────────────────── */}
      <Section
        id="tours"
        spacing="spacious"
      >
        <div className="mx-auto" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <SectionHeader
            eyebrow="Explore"
            title="What kind of adventure are you after?"
            subtitle="Pick a category and explore experiences built for every traveller"
            align="center"
          />

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_CONFIGS.map((cat) => (
              <Link
                key={cat.slug}
                href={`/experiences/${cat.slug}`}
                className="group relative flex min-h-[280px] sm:min-h-[320px] flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
              >
                <Image
                  src={cat.heroImageUrl}
                  alt={cat.label}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="relative mt-auto p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">
                    Explore
                  </p>
                  <h3 className="mt-1.5 font-display text-2xl font-bold text-white leading-tight">
                    {cat.label}
                  </h3>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors group-hover:bg-white/25">
                    View experiences
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      {/* ── TRIP INSPIRATION ─────────────────────────────────────────────── */}
      <TripInspirationSection orgName={org.name} />

      {/* ── FEATURED THIS WEEK ──────────────────────────────────────────── */}
      {featuredTours.length > 0 && (
        <Section id="featured" spacing="spacious" variant="accent">
          <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
            <SectionHeader
              eyebrow="Trending"
              title="Featured This Week"
              subtitle="Handpicked experiences travellers are booking most right now"
              action={
                <Button asChild variant="outline" size="sm" className="hidden sm:flex rounded-full">
                  <Link href="/" className="inline-flex items-center gap-1.5">
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              }
            />

            <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 sm:px-0 pb-4 pt-2 scrollbar-hide">
              {featuredTours.map((tour) => (
                <div
                  key={tour.id}
                  className="w-[85%] sm:w-[320px] lg:w-[340px] flex-none snap-start"
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
        </Section>
      )}

      {/* ── WHY BOOK DIRECT ─────────────────────────────────────────────── */}
      <Section spacing="spacious">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <SectionHeader
            eyebrow="Why us"
            title="Why Book Directly With Us"
            subtitle="Skip the booking platforms. Get the best price, the fastest confirmation, and full support from real people."
            align="center"
          />

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                icon: CheckCircle2,
                color: "bg-emerald-50 text-emerald-600",
                title: "No Middleman Markup",
                body: "Booking directly means no third-party platform fees. You pay the same price — sometimes less — and 100% goes to your local operator.",
              },
              {
                icon: Sparkles,
                color: "bg-amber-50 text-amber-600",
                title: "Instant Confirmation",
                body: "Book now and receive your confirmation email immediately. No wait, no callbacks — your spot is secured the moment payment goes through.",
              },
              {
                icon: Shield,
                color: "bg-sky-50 text-sky-600",
                title: "Local Expert Guides",
                body: "Our guides are certified locals with years of on-the-ground experience. They know every hidden gem, shortcut, and story the guidebooks miss.",
              },
            ].map(({ icon: Icon, color, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
              >
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── REVIEWS ─────────────────────────────────────────────────────── */}
      {recentReviewItems.length > 0 && (
        <Section spacing="spacious" variant="accent">
          <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
            <SectionHeader
              eyebrow="Testimonials"
              title="What Our Guests Say"
              subtitle={`${reviewStats.totalReviews || 0} verified reviews · ${(reviewStats.averageRating || 4.9).toFixed(1)} average`}
              align="center"
            />

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {recentReviewItems.slice(0, 3).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        </Section>
      )}
    </>
  );
}

/* ── Review card ───────────────────────────────────────────────────────── */

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
    <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-stone-200"}`}
          />
        ))}
      </div>
      {review.comment && (
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground line-clamp-4">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
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
