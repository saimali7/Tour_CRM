import type { Metadata } from "next";
import Link from "next/link";
import { requireOrganization } from "@/lib/organization";
import { db, bookings, eq, and } from "@tour/database";
import { CheckCircle2, CalendarPlus, Share2, Eye } from "lucide-react";
import { Breadcrumb, CardSurface, PageShell, SectionHeader } from "@/components/layout";
import { PostBookingWaivers } from "@/components/post-booking-waivers";

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

function formatBookingTime(timeValue: string | null): string {
  if (!timeValue) return "Time TBD";
  const [hoursPart, minutesPart] = timeValue.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return timeValue;
  }

  const normalizedHours = ((hours % 24) + 24) % 24;
  const ampm = normalizedHours >= 12 ? "PM" : "AM";
  const hour12 = normalizedHours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Payment Successful | ${org.name}`,
    description: `Your payment has been processed successfully.`,
  };
}

export default async function PaymentSuccessPage({ params, searchParams }: PageProps) {
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
    customer?: { firstName: string; lastName: string; email: string } | null;
  }) | null;
  const tour = booking?.tour;

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { label: "Tours", href: `/org/${slug}` },
          { label: "Booking Success" },
        ]}
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_55%)]" />
          <div className="relative">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            <SectionHeader
              align="center"
              title="Booking Confirmed"
              subtitle="Payment completed successfully. Your confirmation email is on the way."
              className="mb-0 mt-3"
            />
          </div>
        </div>

        {booking && (
          <CardSurface>
            <h2 className="mb-4 text-lg font-semibold">Booking Details</h2>
            <dl className="space-y-3">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="font-mono font-medium">{booking.referenceNumber}</dd>
              </div>

              {tour && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Tour</dt>
                  <dd className="font-medium text-right">{tour.name}</dd>
                </div>
              )}

              {booking?.bookingDate && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium text-right">{formatBookingDate(booking.bookingDate)}</dd>
                </div>
              )}

              {booking?.bookingTime && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Time</dt>
                  <dd className="font-medium text-right">{formatBookingTime(booking.bookingTime)}</dd>
                </div>
              )}

              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Participants</dt>
                <dd className="font-medium">{booking.totalParticipants}</dd>
              </div>

              <div className="flex justify-between gap-3 border-t pt-3">
                <dt className="font-semibold">Total Paid</dt>
                <dd className="font-semibold">{booking.currency} {booking.total}</dd>
              </div>
            </dl>
          </CardSurface>
        )}

        {booking && (
          <PostBookingWaivers
            bookingId={booking.id}
            customerName={
              booking.customer
                ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
                : undefined
            }
            customerEmail={booking.customer?.email || undefined}
          />
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ref && (
            <Link
              href={`/org/${slug}/booking?ref=${ref}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Link>
          )}
          <Link
            href={`/org/${slug}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-accent"
          >
            <CalendarPlus className="h-4 w-4" />
            Add to Calendar
          </Link>
          <Link
            href={`/org/${slug}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-accent"
          >
            <Share2 className="h-4 w-4" />
            Share Tour
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Need help? <Link href={`/org/${slug}/contact`} className="text-primary hover:underline">Contact support</Link>.
        </p>
      </div>
    </PageShell>
  );
}
