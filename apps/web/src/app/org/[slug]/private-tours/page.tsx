import type { Metadata } from "next";
import Link from "next/link";
import { CarFront, Clock3, Crown, Plane, ShieldCheck } from "lucide-react";
import { requireOrganization, getOrganizationBranding } from "@/lib/organization";
import { createServices } from "@tour/services";
import { Breadcrumb, CardSurface, HeroSection, PageShell, Section, SectionHeader } from "@/components/layout";
import { PrivateInquiryForm } from "@/components/private-inquiry-form";
import { TourCard } from "@/components/tour-card";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);
  return {
    title: `Private Tours & Custom Experiences | ${org.name}`,
    description:
      `Plan a private UAE itinerary with ${org.name}. Tailored experiences with flexible pickup and dedicated support.`,
  };
}

export default async function PrivateToursPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await requireOrganization(slug);
  const branding = getOrganizationBranding(org);
  const services = createServices({ organizationId: org.id });

  const featuredTours = await services.tour.getAll(
    { status: "active", isPublic: true },
    { page: 1, limit: 3 },
    { field: "createdAt", direction: "desc" }
  );

  return (
    <PageShell contentClassName="space-y-8">
      <Breadcrumb
        items={[
          { label: "Tours", href: `/org/${slug}` },
          { label: "Private Tours" },
        ]}
      />

      <HeroSection
        eyebrow="Private Experiences"
        title="Craft a private UAE itinerary built around your group"
        subtitle="From luxury city experiences to private desert routes, we design personalized plans with clear logistics and fast response."
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/30 bg-black/20 px-3 py-1">Dedicated vehicle options</span>
          <span className="rounded-full border border-white/30 bg-black/20 px-3 py-1">Hotel and airport pickup planning</span>
          <span className="rounded-full border border-white/30 bg-black/20 px-3 py-1">Direct operator response</span>
        </div>
      </HeroSection>

      <Section spacing="compact" className="pt-0">
        <div className="grid gap-6 lg:grid-cols-3">
          <CardSurface>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock3 className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-semibold">Fast planning response</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We typically respond in under 2 business hours with first recommendations and pricing guidance.
            </p>
          </CardSurface>

          <CardSurface>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CarFront className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-semibold">Flexible pickup policy</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Share your city and hotel details early so we can confirm route feasibility and pickup timing.
            </p>
          </CardSurface>

          <CardSurface>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-semibold">Clear scope and expectations</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Every private quote includes timing, inclusions, exclusions, and cancellation terms before confirmation.
            </p>
          </CardSurface>
        </div>
      </Section>

      <Section spacing="compact" className="pt-0">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <CardSurface>
              <h3 className="text-lg font-semibold">What to include in your request</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Crown className="mt-0.5 h-4 w-4 text-amber-600" />
                  Group size and trip style (family, VIP, corporate)
                </li>
                <li className="flex items-start gap-2">
                  <Plane className="mt-0.5 h-4 w-4 text-amber-600" />
                  Pickup constraints (hotel, city, airport)
                </li>
                <li className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 h-4 w-4 text-amber-600" />
                  Preferred date/time and flexibility window
                </li>
              </ul>
            </CardSurface>

            <CardSurface>
              <h3 className="text-lg font-semibold">Need an immediate booking?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Browse our public departures and reserve instantly while our team works on your private request.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
              >
                Browse public tours
              </Link>
            </CardSurface>
          </div>

          <div className="lg:col-span-2">
            <CardSurface className="p-6 sm:p-8">
              <SectionHeader
                title="Request your private itinerary"
                subtitle={`Tell ${branding.name} what you need and we will reply with a tailored plan.`}
              />
              <PrivateInquiryForm organizationId={org.id} organizationName={branding.name} />
            </CardSurface>
          </div>
        </div>
      </Section>

      {featuredTours.data.length > 0 ? (
        <Section spacing="compact" className="pt-0">
          <SectionHeader
            title="Popular experiences to customize"
            subtitle="These can be adapted into private versions based on your preferences."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {featuredTours.data.map((tour) => (
              <TourCard key={tour.id} tour={tour} currency={branding.currency} socialProofLabel="Private upgrade available" />
            ))}
          </div>
        </Section>
      ) : null}
    </PageShell>
  );
}
