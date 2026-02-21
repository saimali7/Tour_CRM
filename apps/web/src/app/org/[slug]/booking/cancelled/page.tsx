import type { Metadata } from "next";
import Link from "next/link";
import { requireOrganization } from "@/lib/organization";
import { createServices } from "@tour/services";
import { XCircle, RotateCcw, LifeBuoy } from "lucide-react";
import { Breadcrumb, Section } from "@/components/layout";
import { ResumePaymentButton } from "@/components/resume-payment-button";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}

function formatBookingDate(dateValue: Date | null): string {
  if (!dateValue) return "Date TBD";
  return dateValue.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Payment Cancelled | ${org.name}`,
    description: `Your payment was cancelled.`,
  };
}

export default async function PaymentCancelledPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const org = await requireOrganization(slug);

  const services = createServices({ organizationId: org.id });

  const booking = ref
    ? await services.booking.getByReference(ref).catch(() => null)
    : null;

  const tour = booking?.tour as { name: string } | null | undefined;
  const customer = booking?.customer as { email: string | null } | null | undefined;

  return (
    <Section spacing="spacious">
      <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Payment Cancelled" },
          ]}
        />

        <div className="mx-auto mt-6 max-w-2xl space-y-6">
          {/* Cancelled banner */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-[var(--shadow-sm)]">
            <XCircle className="mx-auto h-16 w-16 text-amber-600" />
            <h1 className="text-display mt-4">Payment Cancelled</h1>
            <p className="mt-2 text-muted-foreground">
              No worries. Your booking details are still saved and you can complete payment whenever you&apos;re ready.
            </p>
          </div>

          {/* Pending booking details */}
          {booking && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
              <h2 className="mb-5 text-heading font-bold">Pending Booking</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="font-mono font-semibold">{booking.referenceNumber}</dd>
                </div>

                {tour && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Tour</dt>
                    <dd className="text-right font-semibold">{tour.name}</dd>
                  </div>
                )}

                {booking.bookingDate && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="text-right font-medium">{formatBookingDate(booking.bookingDate)}</dd>
                  </div>
                )}

                <div className="flex justify-between gap-3 border-t border-border pt-3">
                  <dt className="font-bold">Amount Due</dt>
                  <dd className="font-bold">{booking.currency} {booking.total}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {customer?.email && ref ? (
              <ResumePaymentButton
                referenceNumber={ref}
                email={customer.email}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90"
              />
            ) : ref ? (
              <Link
                href={`/booking?ref=${ref}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90"
              >
                <RotateCcw className="h-4 w-4" />
                Find Booking
              </Link>
            ) : null}
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium transition hover:bg-stone-50"
            >
              Browse Tours
            </Link>
          </div>

          {/* Support */}
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-sm)]">
            <p className="inline-flex items-center gap-2 font-semibold text-foreground">
              <LifeBuoy className="h-4 w-4" />
              Need support?
            </p>
            <p className="mt-1">
              If you need help completing the booking, reach out via{" "}
              <Link href="/contact" className="text-primary hover:underline">
                contact page
              </Link>
              {org.phone ? (
                <>
                  {" "}or call <a href={`tel:${org.phone}`} className="text-primary hover:underline">{org.phone}</a>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
