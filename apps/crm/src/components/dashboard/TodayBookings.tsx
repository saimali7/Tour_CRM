"use client";

import React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Route } from "next";
import {
  Clock,
  Users,
  ChevronRight,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  User,
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

// =============================================================================
// TYPES
// =============================================================================

interface TodayBooking {
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

interface TodayBookingsProps {
  bookings: TodayBooking[];
  orgSlug: string;
  maxItems?: number;
  className?: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getStatusColor(status: TodayBooking["status"]): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "pending":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "completed":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "no_show":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getPaymentStatusIcon(paymentStatus: TodayBooking["paymentStatus"]) {
  switch (paymentStatus) {
    case "paid":
      return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
    case "partial":
      return <CreditCard className="h-3 w-3 text-amber-500" />;
    case "pending":
      return <AlertCircle className="h-3 w-3 text-amber-500" />;
    case "failed":
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const mins = differenceInMinutes(date, now);
  if (mins < 0) return "Started";
  if (mins < 60) return `in ${mins}m`;
  if (mins < 120) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  return format(date, "h:mm a");
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TodayBookings({
  bookings,
  orgSlug,
  maxItems = 10,
  className,
}: TodayBookingsProps) {
  const displayBookings = bookings.slice(0, maxItems);

  if (displayBookings.length === 0) {
    return (
      <section className={className}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Today&apos;s Bookings
          </h2>
        </div>
        <EmptyBookings slug={orgSlug} />
      </section>
    );
  }

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          Today&apos;s Bookings ({bookings.length})
        </h2>
        <Link
          href={`/org/${orgSlug}/bookings` as Route}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 hover:gap-1.5 transition-all"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        {displayBookings.map((booking, idx) => (
          <BookingRow
            key={booking.bookingId}
            booking={booking}
            slug={orgSlug}
            index={idx}
          />
        ))}
      </div>

      {bookings.length > maxItems && (
        <div className="mt-2 text-center">
          <Link
            href={`/org/${orgSlug}/bookings` as Route}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            +{bookings.length - maxItems} more bookings
          </Link>
        </div>
      )}
    </section>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function BookingRow({
  booking,
  slug,
  index,
}: {
  booking: TodayBooking;
  slug: string;
  index: number;
}) {
  const startTime = new Date(booking.schedule.startsAt);
  const minsUntil = differenceInMinutes(startTime, new Date());
  const isStartingSoon = minsUntil <= 60 && minsUntil > 0;
  const isStartingVerySoon = minsUntil <= 15 && minsUntil > 0;

  return (
    <Link
      href={`/org/${slug}/bookings/${booking.bookingId}` as Route}
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
    >
      {/* Time */}
      <div className="w-16 flex-shrink-0">
        <p
          className={cn(
            "text-sm font-mono tabular-nums font-medium",
            isStartingVerySoon
              ? "text-destructive"
              : isStartingSoon
                ? "text-primary"
                : "text-foreground"
          )}
        >
          {format(startTime, "h:mm a")}
        </p>
        {isStartingSoon && (
          <p
            className={cn(
              "text-[10px] font-medium",
              isStartingVerySoon ? "text-destructive" : "text-primary"
            )}
          >
            {getRelativeTime(startTime)}
          </p>
        )}
      </div>

      {/* Customer + Tour */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {booking.customer.firstName} {booking.customer.lastName}
          </p>
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
            getStatusColor(booking.status)
          )}>
            {booking.status}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">
            {booking.tour.name}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {booking.participants}
          </span>
        </div>
      </div>

      {/* Payment + Amount */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            {getPaymentStatusIcon(booking.paymentStatus)}
            <p className="text-sm font-medium text-foreground tabular-nums">
              ${parseFloat(booking.total).toFixed(0)}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {booking.referenceNumber}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

function EmptyBookings({ slug }: { slug: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border/60 p-10 text-center bg-gradient-to-b from-muted/20 to-muted/40">
      <div className="flex justify-center mb-4">
        <div className="h-14 w-14 rounded-2xl bg-muted/80 flex items-center justify-center">
          <Calendar className="h-7 w-7 text-muted-foreground/70" />
        </div>
      </div>
      <p className="text-base font-semibold text-foreground mb-1">No bookings for today</p>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
        When customers book tours for today, they&apos;ll appear here
      </p>
      <Link
        href={`/org/${slug}/bookings` as Route}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
      >
        View all bookings
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default TodayBookings;
