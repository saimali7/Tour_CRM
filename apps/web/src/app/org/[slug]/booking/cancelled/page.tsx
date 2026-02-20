import type { Metadata } from "next";
import Link from "next/link";
import { requireOrganization } from "@/lib/organization";
import { db, bookings, eq, and } from "@tour/database";
import { XCircle, RotateCcw, LifeBuoy } from "lucide-react";
import { Breadcrumb, CardSurface, PageShell, SectionHeader } from "@/components/layout";
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

  const bookingResult = ref
    ? await db.query.bookings.findFirst({
        where: and(
          eq(bookings.organizationId, org.id),
          eq(bookings.referenceNumber, ref)
        ),
        with: {
          tour: true,
          customer: true,
        },
      })
    : null;

  const booking = bookingResult as (typeof bookingResult & {
    tour?: { name: string } | null;
    customer?: { email: string | null } | null;
  }) | null;

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { label: "Tours", href: `/org/${slug}` },
          { label: "Payment Cancelled" },
        ]}
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <XCircle className="mx-auto h-14 w-14 text-amber-600" />
          <SectionHeader
            align="center"
            title="Payment Cancelled"
            subtitle="No worries. Your booking details are still saved and you can complete payment whenever you’re ready."
            className="mb-0 mt-3"
          />
        </div>

        {booking && (
          <CardSurface>
            <h2 className="mb-4 text-lg font-semibold">Pending Booking</h2>
            <dl className="space-y-3">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="font-mono font-medium">{booking.referenceNumber}</dd>
              </div>

              {booking.tour && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Tour</dt>
                  <dd className="text-right font-medium">{booking.tour.name}</dd>
                </div>
              )}

              {booking.bookingDate && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="text-right font-medium">{formatBookingDate(booking.bookingDate)}</dd>
                </div>
              )}

              <div className="flex justify-between gap-3 border-t pt-3">
                <dt className="font-semibold">Amount Due</dt>
                <dd className="font-semibold">{booking.currency} {booking.total}</dd>
              </div>
            </dl>
          </CardSurface>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {booking?.customer?.email && ref ? (
            <ResumePaymentButton
              referenceNumber={ref}
              email={booking.customer.email}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            />
          ) : ref ? (
            <Link
              href={`/org/${slug}/booking?ref=${ref}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <RotateCcw className="h-4 w-4" />
              Find Booking
            </Link>
          ) : null}
          <Link
            href={`/org/${slug}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-accent"
          >
            Browse Tours
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          <p className="inline-flex items-center gap-2 font-medium text-foreground">
            <LifeBuoy className="h-4 w-4" />
            Need support?
          </p>
          <p className="mt-1">
            If you need help completing the booking, reach out via{" "}
            <Link href={`/org/${slug}/contact`} className="text-primary hover:underline">
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
    </PageShell>
  );
}
