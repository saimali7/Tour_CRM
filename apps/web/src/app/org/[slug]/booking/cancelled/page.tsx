import type { Metadata } from "next";
import { requireOrganization } from "@/lib/organization";
import { db, bookings, eq, and } from "@tour/database";
import { XCircle } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
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

  // Try to fetch booking details if reference provided
  const bookingResult = ref
    ? await db.query.bookings.findFirst({
        where: and(
          eq(bookings.organizationId, org.id),
          eq(bookings.referenceNumber, ref)
        ),
        with: {
          schedule: {
            with: {
              tour: true,
            },
          },
        },
      })
    : null;

  // Type the booking with schedule relation
  const booking = bookingResult as typeof bookingResult & {
    schedule?: { startsAt: Date; tour?: { name: string } };
  } | null;

  return (
    <div className="container px-4 py-12">
      <div className="max-w-lg mx-auto text-center">
        {/* Cancelled Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100">
            <XCircle className="w-10 h-10 text-amber-600" />
          </div>
        </div>

        {/* Cancelled Message */}
        <h1 className="text-3xl font-bold mb-3">Payment Cancelled</h1>
        <p className="text-muted-foreground mb-8">
          Your payment was cancelled. Don&apos;t worry, your booking is still pending and you can complete the payment when you&apos;re ready.
        </p>

        {/* Booking Info */}
        {booking && (
          <div className="bg-muted/30 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold mb-4">Your Pending Booking</h2>

            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="font-mono font-medium">{booking.referenceNumber}</dd>
              </div>

              {booking.schedule?.tour && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tour</dt>
                  <dd className="font-medium">{booking.schedule.tour.name}</dd>
                </div>
              )}

              {booking.schedule && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium">
                    {new Date(booking.schedule.startsAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              )}

              <div className="border-t pt-3 flex justify-between">
                <dt className="font-semibold">Amount Due</dt>
                <dd className="font-semibold">
                  {booking.currency} {booking.total}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {ref && (
            <Link
              href={`/booking?ref=${ref}`}
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              View Booking & Pay
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
          >
            Browse Tours
          </Link>
        </div>

        {/* Help Info */}
        <div className="mt-8 text-sm text-muted-foreground">
          <p className="mb-2">
            Your booking will remain pending until payment is completed. If you have any questions or need assistance, please{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact us
            </Link>
            .
          </p>
          <p>
            Need to speak with someone?{" "}
            {org.phone && (
              <a href={`tel:${org.phone}`} className="text-primary hover:underline">
                Call {org.phone}
              </a>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
