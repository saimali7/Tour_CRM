import type { Metadata } from "next";
import { requireOrganization } from "@/lib/organization";
import { db, bookings, eq, and } from "@tour/database";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
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
  const schedule = booking?.schedule;
  const tour = schedule?.tour;

  return (
    <div className="container px-4 py-12">
      <div className="max-w-lg mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold mb-3">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for your booking. Your payment has been processed successfully and you should receive a confirmation email shortly.
        </p>

        {/* Booking Details Card */}
        {booking && (
          <div className="bg-muted/30 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold mb-4">Booking Details</h2>

            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="font-mono font-medium">{booking.referenceNumber}</dd>
              </div>

              {tour && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tour</dt>
                  <dd className="font-medium">{tour.name}</dd>
                </div>
              )}

              {schedule && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium">
                    {new Date(schedule.startsAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              )}

              {schedule && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Time</dt>
                  <dd className="font-medium">
                    {new Date(schedule.startsAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
              )}

              <div className="flex justify-between">
                <dt className="text-muted-foreground">Participants</dt>
                <dd className="font-medium">{booking.totalParticipants}</dd>
              </div>

              <div className="border-t pt-3 flex justify-between">
                <dt className="font-semibold">Total Paid</dt>
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
              View Booking Details
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
          >
            Browse More Tours
          </Link>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-sm text-muted-foreground">
          <p>
            Questions about your booking?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
