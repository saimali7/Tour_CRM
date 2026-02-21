import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format, addDays } from "date-fns";
import {
  ArrowRight,
  Star,
  Users,
  Shield,
  Calendar,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { requireOrganization } from "@/lib/organization";
import { getCategoryConfig, CATEGORY_CONFIGS } from "@/lib/category-config";
import { createServices } from "@tour/services";
import { TourCard } from "@/components/tour-card";
import {
  Section,
  SectionHeader,
  HeroSection,
  Breadcrumb,
} from "@/components/layout";
import {
  BreadcrumbStructuredData,
  FAQStructuredData,
  OrganizationStructuredData,
  TourCategoryStructuredData,
} from "@/components/structured-data";
import { getOrganizationBookingUrl } from "@/lib/organization";

interface PageProps {
  params: Promise<{ slug: string; category: string }>;
}

/* -------------------------------------------------------------------------- */
/*  Static generation                                                          */
/* -------------------------------------------------------------------------- */

export async function generateStaticParams() {
  return CATEGORY_CONFIGS.map((c) => ({ category: c.slug }));
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, category } = await params;
  const [org, config] = await Promise.all([
    requireOrganization(slug).catch(() => null),
    Promise.resolve(getCategoryConfig(category)),
  ]);

  if (!org || !config) {
    return { title: "Not Found" };
  }

  const title = `${config.title} | Book Online | ${org.name}`;
  const baseUrl = getOrganizationBookingUrl(org);

  return {
    title,
    description: config.metaDescription,
    openGraph: {
      title,
      description: config.metaDescription,
      type: "website",
      images: config.heroImageUrl ? [{ url: config.heroImageUrl }] : [],
      url: `${baseUrl}/experiences/${config.slug}`,
    },
    alternates: {
      canonical: `${baseUrl}/experiences/${config.slug}`,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Category FAQ Accordion (client component not needed — pure CSS)           */
/* -------------------------------------------------------------------------- */

function FAQAccordion({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-border">
      {faqs.map((faq, i) => (
        <details key={i} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground hover:text-primary transition-colors">
            {faq.question}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function CategoryHubPage({ params }: PageProps) {
  const { slug, category } = await params;

  const config = getCategoryConfig(category);
  if (!config) notFound();

  const org = await requireOrganization(slug);
  const services = createServices({ organizationId: org.id });
  const currency = org.settings?.defaultCurrency || "USD";

  const [toursResult, reviewStats, weekBookingStats] = await Promise.all([
    services.tour.getAll(
      { status: "active", isPublic: true, category: config.dbCategory },
      { page: 1, limit: 24 },
      { field: "createdAt", direction: "desc" }
    ),
    services.review.getStats().catch(() => ({
      totalReviews: 0,
      averageRating: 4.9,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pendingReviews: 0,
      publicTestimonials: 0,
    })),
    services.analytics
      .getBookingStats({
        from: addDays(new Date(), -7),
        to: new Date(),
      })
      .catch(() => ({ totalBookings: 0, totalParticipants: 0, bookingsByTour: [] })),
  ]);

  const { data: tours, total } = toursResult;
  const weeklyBookingsByTour = new Map(
    (weekBookingStats.bookingsByTour ?? []).map((item) => [
      item.tourId,
      item.bookingCount,
    ])
  );

  /* Availability labels */
  const tomorrowKey = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const availabilityLabels = new Map<string, string | null>();
  await Promise.all(
    tours.map(async (tour) => {
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

  /* Related categories */
  const relatedCategories = CATEGORY_CONFIGS.filter((c) => c.slug !== config.slug);

  const baseUrl = getOrganizationBookingUrl(org).replace(/\/$/, "");
  const breadcrumbs = [
    { name: "Home", url: `${baseUrl}/` },
    { name: "Experiences", url: `${baseUrl}/experiences/${config.slug}` },
    { name: config.label, url: `${baseUrl}/experiences/${config.slug}` },
  ];

  return (
    <>
      {/* SEO structured data */}
      <OrganizationStructuredData org={org} />
      <BreadcrumbStructuredData items={breadcrumbs} baseUrl={baseUrl} />
      <FAQStructuredData items={config.faqs} />
      <TourCategoryStructuredData
        categoryTitle={config.title}
        categoryDescription={config.metaDescription}
        categoryUrl={`${baseUrl}/experiences/${config.slug}`}
        tours={tours.map((t) => ({ name: t.name, slug: t.slug, coverImageUrl: t.coverImageUrl }))}
        org={org}
      />

      {/* ── BREADCRUMB ──────────────────────────────────────────────────── */}
      <div className="mx-auto px-[var(--page-gutter)] py-3" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Experiences", href: `#` },
            { label: config.label },
          ]}
        />
      </div>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <HeroSection
        eyebrow={`${total} experiences available`}
        title={config.title}
        subtitle={config.subtitle}
        imageUrl={config.heroImageUrl}
      >
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#tours"
            className="inline-flex items-center gap-2 rounded-full bg-white/95 px-6 py-2.5 text-sm font-semibold text-stone-900 shadow-md transition-all hover:bg-white hover:scale-[1.02]"
          >
            Browse {total} {config.label}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </HeroSection>

      {/* ── TRUST STRIP ─────────────────────────────────────────────────── */}
      <div className="relative z-20 -mt-8 mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
        <div className="flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl px-6 py-4 shadow-[var(--shadow-md)]">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span>{(reviewStats.averageRating || 4.9).toFixed(1)} average rating</span>
          </div>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-primary" />
            <span>2,400+ guests this year</span>
          </div>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span>Licensed &amp; insured operator</span>
          </div>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>Free cancellation available</span>
          </div>
        </div>
      </div>

      {/* ── SEO INTRO CONTENT ───────────────────────────────────────────── */}
      <Section spacing="default">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <div className="max-w-3xl space-y-4">
            {config.intro.map((para, i) => (
              <p key={i} className="text-body leading-relaxed text-muted-foreground">
                {para}
              </p>
            ))}
          </div>
        </div>
      </Section>

      {/* ── TOUR GRID ───────────────────────────────────────────────────── */}
      <Section spacing="default" id="tours">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <SectionHeader
            eyebrow="Book online"
            title={`${total} ${config.label} Available`}
            subtitle="Browse, compare, and reserve instantly with live availability"
          />

          {tours.length === 0 ? (
            <div className="py-16 text-center">
              <h3 className="text-lg font-semibold">No tours available right now</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Check back soon — new experiences are added regularly.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Browse all experiences
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 xl:gap-6">
              {tours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  currency={currency}
                  variant="expanded"
                  availabilityLabel={availabilityLabels.get(tour.id) || null}
                  socialProofLabel={
                    weeklyBookingsByTour.get(tour.id)
                      ? `${weeklyBookingsByTour.get(tour.id)} booked this week`
                      : "Popular with guests"
                  }
                />
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── WHY CHOOSE US ───────────────────────────────────────────────── */}
      <Section spacing="spacious" variant="accent">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <SectionHeader
            eyebrow="Direct booking"
            title="Why Book Directly With Us"
            subtitle="No third-party commissions. No hidden fees. Just great experiences."
          />
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Expert Local Guides",
                body: "Every guide is a certified local expert with years of experience and genuine passion for sharing their home city.",
              },
              {
                icon: CheckCircle2,
                title: "Instant Confirmation",
                body: "Book now and receive instant confirmation. No waiting, no phone calls — your spot is secured the moment you pay.",
              },
              {
                icon: Shield,
                title: "Free Cancellation",
                body: "Plans change. Most of our experiences offer free cancellation up to 24 hours before departure, no questions asked.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-sm)]"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <Section spacing="spacious">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <SectionHeader
                eyebrow="FAQ"
                title={`${config.label} — Frequently Asked Questions`}
                subtitle="Everything you need to know before you book"
              />
            </div>
            <div>
              <FAQAccordion faqs={config.faqs} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── RELATED CATEGORIES ──────────────────────────────────────────── */}
      <Section spacing="spacious" variant="accent">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <SectionHeader
            eyebrow="Explore more"
            title="You Might Also Love"
            subtitle="Explore more ways to experience Dubai"
          />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {relatedCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/experiences/${cat.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-[var(--shadow-md)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Explore
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {cat.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {cat.subtitle.slice(0, 80)}...
                </p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Browse experiences
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
