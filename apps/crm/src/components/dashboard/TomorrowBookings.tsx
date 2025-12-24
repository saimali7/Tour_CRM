"use client";

import React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Route } from "next";
import {
  Users,
  ChevronRight,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

// =============================================================================
// TYPES
// =============================================================================

interface TomorrowBooking {
  bookingId: string;
  referenceNumber: string;
  status: "pending" | "confirmed" | "completed" | "no_show";
  paymentStatus: "pending" | "partial" | "paid" | "refunded" | "failed";
  participants: number;
  total: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  tour: {
    id: string;
    name: string;
  };
  schedule: {
    id: string;
    startsAt: Date | string;
    endsAt: Date | string;
  };
}

interface TomorrowBookingsProps {
  bookings: TomorrowBooking[];
  orgSlug: string;
  maxItems?: number;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TomorrowBookings({
  bookings,
  orgSlug,
  maxItems = 5,
  className,
}: TomorrowBookingsProps) {
  const displayBookings = bookings.slice(0, maxItems);
  const totalGuests = bookings.reduce((sum, b) => sum + b.participants, 0);

  if (displayBookings.length === 0) {
    return null; // Don't show section if no bookings tomorrow
  }

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          Tomorrow ({bookings.length} bookings · {totalGuests} guests)
        </h2>
        <Link
          href={`/org/${orgSlug}/calendar` as Route}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 hover:gap-1.5 transition-all"
        >
          View calendar
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        {displayBookings.map((booking) => (
          <TomorrowBookingRow
            key={booking.bookingId}
            booking={booking}
            slug={orgSlug}
          />
        ))}
      </div>

      {bookings.length > maxItems && (
        <div className="mt-2 text-center">
          <Link
            href={`/org/${orgSlug}/calendar` as Route}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            +{bookings.length - maxItems} more bookings tomorrow
          </Link>
        </div>
      )}
    </section>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function TomorrowBookingRow({
  booking,
  slug,
}: {
  booking: TomorrowBooking;
  slug: string;
}) {
  const startTime = new Date(booking.schedule.startsAt);
  const needsAttention = booking.status === "pending" || booking.paymentStatus === "pending";

  return (
    <Link
      href={`/org/${slug}/bookings/${booking.bookingId}` as Route}
      className="flex items-center gap-4 px-4 py-2.5 hover:bg-muted/50 transition-colors group"
    >
      {/* Time */}
      <div className="w-16 flex-shrink-0">
        <p className="text-sm font-mono tabular-nums text-muted-foreground">
          {format(startTime, "h:mm a")}
        </p>
      </div>

      {/* Tour + Customer */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">
          {booking.tour.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {booking.customer.firstName} {booking.customer.lastName} · {booking.participants} guests
        </p>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {needsAttention ? (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            {booking.status === "pending" ? "Pending" : "Unpaid"}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

export default TomorrowBookings;
