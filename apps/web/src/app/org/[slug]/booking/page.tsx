import type { Metadata } from "next";
import Link from "next/link";
import { requireOrganization } from "@/lib/organization";
import { BookingLookup } from "@/components/booking-lookup";
import { Breadcrumb, Section, SectionHeader } from "@/components/layout";
import { Button } from "@tour/ui";
import { HelpCircle } from "lucide-react";

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
    <Section spacing="spacious">
      <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Find Booking" },
          ]}
        />

        <div className="mx-auto mt-6 max-w-2xl space-y-6">
          <SectionHeader
            align="center"
            title="Find Your Booking"
            subtitle="Use your booking reference and email to view details, update dates, or request support."
          />
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/contact">Need help now?</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/">Book another tour</Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Where do I find my booking reference?
              </summary>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>Your booking reference (e.g., <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">BK-ABC123</code>) was included in your confirmation email after booking.</p>
                <p>Check your inbox for an email from <strong>{slug.replace(/-/g, " ")}</strong> with the subject &ldquo;Booking Confirmed&rdquo;.</p>
                <p>Can&apos;t find it? <a href="/contact" className="text-primary hover:underline">Contact support</a> and we&apos;ll help you locate it.</p>
              </div>
            </details>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
            <BookingLookup
              organizationSlug={slug}
              initialReferenceNumber={ref}
              magicToken={token}
            />
          </div>

          <div className="rounded-2xl border border-border bg-stone-50 px-5 py-4 text-center text-xs text-muted-foreground">
            After looking up your booking you can view details, reschedule dates, update guest info, or request a cancellation.
          </div>
        </div>
      </div>
    </Section>
  );
}
