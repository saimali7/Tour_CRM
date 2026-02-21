import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Mail, Phone, Globe, Clock, Users, CalendarDays, Star, ArrowRight } from "lucide-react";
import { requireOrganization, getOrganizationBranding } from "@/lib/organization";
import { createServices } from "@tour/services";
import { Breadcrumb, Section, SectionHeader, HeroSection } from "@/components/layout";
import { Button } from "@tour/ui";
import { CATEGORY_CONFIGS } from "@/lib/category-config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `About Us | ${org.name}`,
    description: `Learn more about ${org.name} and our tours. Discover our story, mission, and commitment to providing exceptional tour experiences.`,
    openGraph: {
      title: `About Us | ${org.name}`,
      description: `Learn more about ${org.name} and our tours.`,
      type: "website",
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await requireOrganization(slug);
  const branding = getOrganizationBranding(org);
  const services = createServices({ organizationId: org.id });

  const [toursResult, bookingStats, reviewStats, guidesResult] = await Promise.all([
    services.tour.getAll({ status: "active", isPublic: true }, { page: 1, limit: 1 }),
    services.analytics.getBookingStats({
      from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      to: new Date(),
    }).catch(() => ({ totalBookings: 0, totalParticipants: 0 })),
    services.review.getStats().catch(() => ({ averageRating: 4.8, totalReviews: 0 })),
    services.guide.getAll({ status: "active" }, { page: 1, limit: 4 }).catch(() => ({ data: [] })),
  ]);

  const yearsOperating = Math.max(1, new Date().getFullYear() - new Date(org.createdAt).getFullYear());

  return (
    <>
      <HeroSection
        eyebrow="Our Story"
        title={`About ${branding.name}`}
        subtitle="We design small-group and private experiences that balance local insight, smooth operations, and memorable moments."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-white/95 text-stone-900 hover:bg-white px-6 h-11">
            <Link href="/" className="inline-flex items-center gap-2">
              Browse Tours
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10 px-6 h-11">
            <Link href="/private-tours">Request Private Itinerary</Link>
          </Button>
        </div>
      </HeroSection>

      {/* Stats */}
      <div className="relative z-20 -mt-10 mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { value: toursResult.total, label: "Active tours" },
            { value: bookingStats.totalBookings || 0, label: "Bookings this year" },
            { value: bookingStats.totalParticipants || 0, label: "Guests hosted" },
            { value: `${yearsOperating}+`, label: "Years operating" },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-md)]">
              <p className="text-3xl font-bold tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground uppercase tracking-[0.1em]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What makes us different */}
      <Section spacing="spacious">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <SectionHeader
            eyebrow="Why us"
            title="What makes us different"
            subtitle="Built specifically for travelers who want confidence before they arrive."
          />
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: Clock,
                title: "Operational precision",
                body: "Clear timings, transparent pickup guidance, and instant confirmations.",
              },
              {
                icon: MapPin,
                title: "Local-first routes",
                body: "Our itineraries prioritize authentic stops, not generic mass-tour loops.",
              },
              {
                icon: Star,
                title: "Quality you can trust",
                body: `${reviewStats.totalReviews || 0} public reviews with an average rating of ${(reviewStats.averageRating || 4.8).toFixed(1)}.`,
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-sm)]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Guides */}
      {guidesResult.data.length > 0 && (
        <Section spacing="default" variant="accent">
          <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
            <SectionHeader
              eyebrow="The team"
              title="Meet some of our guides"
              subtitle="Experienced hosts who know the destination beyond the highlights."
            />
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {guidesResult.data.map((guide) => (
                <div key={guide.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {guide.firstName.charAt(0)}{guide.lastName.charAt(0)}
                  </span>
                  <div>
                    <p className="font-semibold">{guide.firstName} {guide.lastName}</p>
                    <p className="text-sm text-muted-foreground">{guide.languages?.length ? guide.languages.join(", ") : "Multilingual guide"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Our expertise */}
      <Section spacing="spacious">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <SectionHeader
            eyebrow="Explore"
            title="Our Expertise"
            subtitle="We specialise in four core categories of Dubai experience"
          />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CATEGORY_CONFIGS.map((cat) => (
              <Link
                key={cat.slug}
                href={`/experiences/${cat.slug}`}
                className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-[var(--shadow-md)]"
              >
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {cat.label}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </Section>

      {/* Contact details */}
      <Section spacing="default" variant="accent">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-sm)]">
            <h2 className="text-heading mb-6">Contact & Company Details</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {branding.email && (
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <a href={`mailto:${branding.email}`} className="text-sm text-primary hover:underline">{branding.email}</a>
                  </div>
                </div>
              )}
              {branding.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <a href={`tel:${branding.phone}`} className="text-sm text-primary hover:underline">{branding.phone}</a>
                  </div>
                </div>
              )}
              {branding.website && (
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Website</p>
                    <a href={branding.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{branding.website}</a>
                  </div>
                </div>
              )}
              {branding.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{branding.address}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Operating for</p>
                  <p className="text-sm text-muted-foreground">{yearsOperating}+ years</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Team size</p>
                  <p className="text-sm text-muted-foreground">{guidesResult.data.length || 1} active guides</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
