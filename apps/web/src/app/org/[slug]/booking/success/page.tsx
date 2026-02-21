import type { Metadata } from "next";
import Link from "next/link";
import { requireOrganization } from "@/lib/organization";
import { createServices } from "@tour/services";
import { CheckCircle2, CalendarPlus, Share2, Eye } from "lucide-react";
import { Breadcrumb, Section, SectionHeader } from "@/components/layout";
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

  const services = createServices({ organizationId: org.id });

  const booking = ref
    ? await services.booking.getByReference(ref).catch(() => null)
    : null;

  const tour = booking?.tour as { name: string } | null | undefined;
  const customer = booking?.customer as { firstName: string; lastName: string; email: string } | null | undefined;
  const paidAmount = booking ? parseFloat(booking.paidAmount || "0") : 0;
  const totalAmount = booking ? parseFloat(booking.total || "0") : 0;
  const remainingBalance = Math.max(0, totalAmount - paidAmount);

  return (
    <Section spacing="spacious">
      <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Booking Success" },
          ]}
        />

        <div className="mx-auto mt-6 max-w-2xl space-y-6">
          {/* Success banner */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-[var(--shadow-sm)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_55%)]" />
            <div className="relative">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
              <h1 className="text-display mt-4">Booking Confirmed</h1>
              <p className="mt-2 text-muted-foreground">
                Payment completed successfully. Your confirmation email is on the way.
              </p>
            </div>
          </div>

          {/* Booking details */}
          {booking && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
              <h2 className="mb-5 text-heading font-bold">Booking Details</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="font-mono font-semibold">{booking.referenceNumber}</dd>
                </div>

                {tour && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Tour</dt>
                    <dd className="font-semibold text-right">{tour.name}</dd>
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

                <div className="flex justify-between gap-3 border-t border-border pt-3">
                  <dt className="font-bold">Paid now</dt>
                  <dd className="font-bold">{booking.currency} {paidAmount.toFixed(2)}</dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Balance due</dt>
                  <dd className="font-medium">{booking.currency} {remainingBalance.toFixed(2)}</dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Payment status</dt>
                  <dd className="font-medium capitalize">{booking.paymentStatus.replace("_", " ")}</dd>
                </div>
              </dl>
            </div>
          )}

          {booking && (
            <PostBookingWaivers
              bookingId={booking.id}
              customerName={
                customer
                  ? `${customer.firstName} ${customer.lastName}`.trim()
                  : undefined
              }
              customerEmail={customer?.email || undefined}
            />
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ref && (
              <Link
                href={`/booking?ref=${ref}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90"
              >
                <Eye className="h-4 w-4" />
                View Details
              </Link>
            )}
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium transition hover:bg-stone-50"
            >
              <CalendarPlus className="h-4 w-4" />
              Add to Calendar
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium transition hover:bg-stone-50"
            >
              <Share2 className="h-4 w-4" />
              Share Tour
            </Link>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Need help? <Link href="/contact" className="text-primary hover:underline">Contact support</Link>.
          </p>
        </div>
      </div>
    </Section>
  );
}
