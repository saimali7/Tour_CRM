import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Mail, Phone, Globe, Clock, Users, CalendarDays, Star } from "lucide-react";
import { requireOrganization, getOrganizationBranding } from "@/lib/organization";
import { createServices } from "@tour/services";
import { Breadcrumb, CardSurface, PageShell, Section, SectionHeader } from "@/components/layout";
import { FadeIn, StaggerChildren } from "@/components/layout/animate";
import { Button } from "@tour/ui";

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
    <PageShell>
      <Breadcrumb
        items={[
          { label: "Home", href: `/org/${slug}` },
          { label: "About Us" },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-10">
        <FadeIn>
          <SectionHeader
            align="center"
            title={`About ${branding.name}`}
            subtitle="We design small-group and private experiences that balance local insight, smooth operations, and memorable moments."
          />
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Browse tours</Link>
            </Button>
            <Button asChild>
              <Link href="/private-tours">Request private itinerary</Link>
            </Button>
          </div>
          {branding.logo ? (
            <div className="mx-auto mt-5 h-24 w-24 overflow-hidden rounded-2xl border border-border bg-card p-2">
              <Image src={branding.logo} alt={branding.name} width={96} height={96} className="h-full w-full object-contain" />
            </div>
          ) : null}
        </FadeIn>

        <Section spacing="compact" className="pt-0">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <CardSurface className="text-center" padded>
              <p className="text-2xl font-semibold">{toursResult.total}</p>
              <p className="mt-1 text-xs text-muted-foreground">Active tours</p>
            </CardSurface>
            <CardSurface className="text-center" padded>
              <p className="text-2xl font-semibold">{bookingStats.totalBookings || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Bookings this year</p>
            </CardSurface>
            <CardSurface className="text-center" padded>
              <p className="text-2xl font-semibold">{bookingStats.totalParticipants || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Guests hosted</p>
            </CardSurface>
            <CardSurface className="text-center" padded>
              <p className="text-2xl font-semibold">{yearsOperating}+</p>
              <p className="mt-1 text-xs text-muted-foreground">Years operating</p>
            </CardSurface>
          </div>
        </Section>

        <Section spacing="compact" className="pt-0">
          <SectionHeader title="What makes us different" subtitle="Built specifically for travelers who want confidence before they arrive." />
          <StaggerChildren className="grid grid-cols-1 gap-4 md:grid-cols-3" stepMs={90}>
            <CardSurface>
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">Operational precision</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Clear timings, transparent pickup guidance, and instant confirmations.
              </p>
            </CardSurface>
            <CardSurface>
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">Local-first routes</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Our itineraries prioritize authentic stops, not generic mass-tour loops.
              </p>
            </CardSurface>
            <CardSurface>
              <Star className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">Quality you can trust</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {reviewStats.totalReviews || 0} public reviews with an average rating of {(reviewStats.averageRating || 4.8).toFixed(1)}.
              </p>
            </CardSurface>
          </StaggerChildren>
        </Section>

        {guidesResult.data.length > 0 && (
          <Section spacing="compact" className="pt-0">
            <SectionHeader title="Meet some of our guides" subtitle="Experienced hosts who know the destination beyond the highlights." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {guidesResult.data.map((guide) => (
                <CardSurface key={guide.id} className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {guide.firstName.charAt(0)}{guide.lastName.charAt(0)}
                  </span>
                  <div>
                    <p className="font-medium">{guide.firstName} {guide.lastName}</p>
                    <p className="text-sm text-muted-foreground">{guide.languages?.length ? guide.languages.join(", ") : "Multilingual guide"}</p>
                  </div>
                </CardSurface>
              ))}
            </div>
          </Section>
        )}

        <Section spacing="compact" className="pt-0">
          <CardSurface>
            <h2 className="text-xl font-semibold">Contact & company details</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {branding.email && (
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a href={`mailto:${branding.email}`} className="text-primary hover:underline">
                      {branding.email}
                    </a>
                  </div>
                </div>
              )}
              {branding.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <a href={`tel:${branding.phone}`} className="text-primary hover:underline">
                      {branding.phone}
                    </a>
                  </div>
                </div>
              )}
              {branding.website && (
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Website</p>
                    <a href={branding.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {branding.website}
                    </a>
                  </div>
                </div>
              )}
              {branding.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-muted-foreground">{branding.address}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Operating for</p>
                  <p className="text-muted-foreground">{yearsOperating}+ years</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Team size</p>
                  <p className="text-muted-foreground">{guidesResult.data.length || 1} active guides</p>
                </div>
              </div>
            </div>
          </CardSurface>
        </Section>
      </div>
    </PageShell>
  );
}
