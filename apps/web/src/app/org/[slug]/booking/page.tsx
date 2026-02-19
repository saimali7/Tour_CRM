import type { Metadata } from "next";
import Link from "next/link";
import { requireOrganization } from "@/lib/organization";
import { BookingLookup } from "@/components/booking-lookup";
import { Breadcrumb, CardSurface, PageShell, SectionHeader } from "@/components/layout";
import { Button } from "@tour/ui";

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
          { label: "Home", href: `/org/${slug}` },
          { label: "Find Booking" },
        ]}
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <SectionHeader
          align="center"
          title="Find Your Booking"
          subtitle="Use your booking reference and email to view details, update dates, or request support."
        />
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/contact">Need help now?</Link>
          </Button>
          <Button asChild>
            <Link href="/">Book another tour</Link>
          </Button>
        </div>

        <CardSurface padded>
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
              Where do I find my booking reference?
            </summary>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>Your booking reference (e.g., <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">BK-ABC123</code>) was included in your confirmation email after booking.</p>
              <p>Check your inbox for an email from <strong>{slug.replace(/-/g, " ")}</strong> with the subject &ldquo;Booking Confirmed&rdquo;.</p>
              <p>Can&apos;t find it? <a href="/contact" className="text-primary hover:underline">Contact support</a> and we&apos;ll help you locate it.</p>
            </div>
          </details>
        </CardSurface>

        <CardSurface className="p-6">
          <BookingLookup
            organizationSlug={slug}
            initialReferenceNumber={ref}
            magicToken={token}
          />
        </CardSurface>

        <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3 text-center text-xs text-muted-foreground">
          After looking up your booking you can view details, reschedule dates, update guest info, or request a cancellation.
        </div>
      </div>
    </PageShell>
  );
}
