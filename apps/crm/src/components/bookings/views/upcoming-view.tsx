"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BookingRow } from "../booking-row";
import { Calendar, Users, DollarSign, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface UpcomingViewProps {
  orgSlug: string;
}

// =============================================================================
// UPCOMING VIEW COMPONENT
// =============================================================================

export function UpcomingView({ orgSlug }: UpcomingViewProps) {
  const { data, isLoading } = trpc.booking.getUpcoming.useQuery({ days: 7 });

  // Track which days are expanded (Today and Tomorrow default to expanded)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set(["Today", "Tomorrow"])
  );

  const toggleDay = (dayLabel: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayLabel)) {
        next.delete(dayLabel);
      } else {
        next.add(dayLabel);
      }
      return next;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Overall stats skeleton */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-border bg-card p-4"
            >
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-2 h-8 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>

        {/* Day sections skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
            <div className="space-y-2">
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="h-20 animate-pulse rounded border border-border bg-card"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!data || data.byDay.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          No upcoming bookings
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No upcoming bookings in the next 7 days
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Total Bookings
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {data.stats.totalBookings}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            <Users className="h-4 w-4" />
            Total Guests
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {data.stats.totalGuests}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Total Revenue
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            ${data.stats.totalRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Day Sections */}
      <div className="space-y-4">
        {data.byDay.map((day) => {
          const isExpanded = expandedDays.has(day.dayLabel);
          const hasNeedsAction = day.stats.needsAction > 0;

          return (
            <div
              key={day.date}
              className={cn(
                "overflow-hidden rounded-lg border border-border bg-card",
                hasNeedsAction && "border-l-4 border-l-amber-500"
              )}
            >
              {/* Day Header */}
              <button
                onClick={() => toggleDay(day.dayLabel)}
                className={cn(
                  "flex w-full items-center justify-between gap-4 bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                <div className="flex flex-1 items-center gap-4">
                  {/* Day Label */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {day.dayLabel}
                    </h3>
                    {hasNeedsAction && (
                      <div className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        {day.stats.needsAction} need action
                      </div>
                    )}
                  </div>

                  {/* Day Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{day.stats.total} bookings</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{day.stats.guests} guests</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="tabular-nums">${day.stats.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Expand/Collapse Icon */}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Bookings List */}
              {isExpanded && (
                <div className="space-y-0 divide-y divide-border">
                  {day.bookings.map((booking) => {
                    // Calculate urgency for the booking
                    const needsAction =
                      booking.status === "pending" ||
                      (booking.paymentStatus !== "paid" &&
                        booking.paymentStatus !== "refunded");

                    return (
                      <BookingRow
                        key={booking.id}
                        booking={booking}
                        orgSlug={orgSlug}
                        urgency={needsAction ? "medium" : "none"}
                        showTourTime={true}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
