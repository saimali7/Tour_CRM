import type { Metadata } from "next";
import { requireOrganization } from "@/lib/organization";
import { BookingLookup } from "@/components/booking-lookup";
import { Breadcrumb, CardSurface, PageShell, SectionHeader } from "@/components/layout";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string; token?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Find Your Booking | ${org.name}`,
    description: `Look up your booking with ${org.name} using your reference number or email.`,
  };
}

export default async function BookingLookupPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { ref, token } = await searchParams;
  await requireOrganization(slug);

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { label: "Tours", href: `/org/${slug}` },
          { label: "Find Booking" },
        ]}
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <SectionHeader
          align="center"
          title="Find Your Booking"
          subtitle="Use your booking reference and email to view details, update dates, or request support."
        />

        <CardSurface className="text-center" padded>
          <p className="text-5xl">🎟️</p>
          <p className="mt-2 text-sm text-muted-foreground">Have your confirmation email handy for faster lookup.</p>
        </CardSurface>

        <CardSurface className="p-6">
          <BookingLookup
            organizationSlug={slug}
            initialReferenceNumber={ref}
            magicToken={token}
          />
        </CardSurface>
      </div>
    </PageShell>
  );
}
