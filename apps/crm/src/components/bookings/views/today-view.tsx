"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Clock,
  Users,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Sun,
  Send,
  CheckCircle,
} from "lucide-react";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

// =============================================================================
// TYPES
// =============================================================================

interface TodayViewProps {
  orgSlug: string;
}

interface TimelineBooking {
  id: string;
  referenceNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  totalParticipants: number;
  customer?: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
  tour?: {
    name: string;
  };
  schedule?: {
    startsAt: Date;
  };
  bookingDate?: Date | null;
  bookingTime?: string | null;
  urgency: "critical" | "high" | "medium" | "low" | "none" | "past";
  timeUntil: string;
}

// =============================================================================
// URGENCY CONFIGURATION
// =============================================================================

const urgencyConfig = {
  critical: {
    borderColor: "border-destructive",
    badgeClass: "bg-destructive text-destructive-foreground",
    dotClass: "bg-destructive",
    glowClass: "shadow-destructive/50",
  },
  high: {
    borderColor: "border-warning",
    badgeClass: "bg-warning text-warning-foreground",
    dotClass: "bg-warning",
    glowClass: "shadow-warning/50",
  },
  medium: {
    borderColor: "border-info",
    badgeClass: "bg-info text-info-foreground",
    dotClass: "bg-info",
    glowClass: "shadow-info/50",
  },
  low: {
    borderColor: "border-border",
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
    glowClass: "",
  },
  none: {
    borderColor: "border-border",
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
    glowClass: "",
  },
  past: {
    borderColor: "border-border",
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
    glowClass: "",
  },
} as const;

// =============================================================================
// LOADING SKELETON
// =============================================================================

function TodayViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-6 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Timeline skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 animate-pulse rounded-full bg-muted" />
              {i < 2 && <div className="mt-2 h-full w-0.5 animate-pulse bg-muted" />}
            </div>
            <div className="flex-1 rounded-lg border border-border bg-card p-4">
              <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 py-16 text-center">
      <Sun className="mb-4 h-16 w-16 text-warning" />
      <h3 className="text-lg font-semibold text-foreground">No tours scheduled for today</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Enjoy your day off! Check back tomorrow or view all bookings to see your upcoming schedule.
      </p>
    </div>
  );
}

// =============================================================================
// STATS CARD
// =============================================================================

interface StatsCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  className?: string;
}

function StatsCard({ icon: Icon, label, value, className }: StatsCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md", className)}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

// =============================================================================
// BOOKING CARD
// =============================================================================

interface BookingCardProps {
  booking: TimelineBooking;
  orgSlug: string;
  onConfirm?: (id: string) => void;
  onSendPaymentLink?: (id: string) => void;
}

function BookingCard({ booking, orgSlug, onConfirm, onSendPaymentLink }: BookingCardProps) {
  const config = urgencyConfig[booking.urgency];
  const customerName = booking.customer
    ? `${booking.customer.firstName} ${booking.customer.lastName}`
    : "Walk-in Customer";

  // Format tour time
  const getTourTime = () => {
    if (booking.schedule?.startsAt) {
      return format(new Date(booking.schedule.startsAt), "h:mm a");
    }
    if (booking.bookingTime) {
      return booking.bookingTime;
    }
    return "No time set";
  };

  const tourTime = getTourTime();

  // Show quick actions
  const showConfirmAction = booking.status === "pending" && onConfirm;
  const showPaymentAction = booking.paymentStatus !== "paid" && onSendPaymentLink;

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-4 transition-all duration-150 hover:shadow-md",
        config.borderColor,
        booking.urgency === "critical" && "border-2 shadow-lg",
        booking.urgency === "critical" && config.glowClass
      )}
    >
      {/* Header: Time & Time Until */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{tourTime}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{booking.tour?.name || "Unknown Tour"}</div>
        </div>
        {booking.timeUntil && (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide",
              config.badgeClass
            )}
          >
            <Clock className="h-3 w-3" aria-hidden="true" />
            {booking.timeUntil}
          </div>
        )}
      </div>

      {/* Customer Info */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{customerName}</span>
            <span className="text-xs text-muted-foreground">#{booking.referenceNumber}</span>
          </div>
          {booking.customer?.email && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{booking.customer.email}</div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-shrink-0 items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-mono tabular-nums">{booking.totalParticipants}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-mono tabular-nums">{booking.total}</span>
          </div>
        </div>
      </div>

      {/* Footer: Status & Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <BookingStatusBadge
            status={booking.status as "pending" | "confirmed" | "completed" | "cancelled" | "no_show"}
          />
          <PaymentStatusBadge
            status={booking.paymentStatus as "pending" | "partial" | "paid" | "refunded" | "failed"}
          />
        </div>

        {/* Quick Actions */}
        {(showConfirmAction || showPaymentAction) && (
          <div className="flex items-center gap-2">
            {showConfirmAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm?.(booking.id);
                }}
                className="h-8 gap-1 px-2 text-xs"
              >
                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Confirm</span>
              </Button>
            )}
            {showPaymentAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSendPaymentLink?.(booking.id);
                }}
                className="h-8 gap-1 px-2 text-xs"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Payment</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TodayView({ orgSlug }: TodayViewProps) {
  const { data, isLoading, error } = trpc.booking.getTodayWithUrgency.useQuery();

  // Loading state
  if (isLoading) {
    return <TodayViewSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold text-foreground">Failed to load today's bookings</h3>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  // Empty state
  if (!data || data.bookings.length === 0) {
    return <EmptyState />;
  }

  const { bookings, stats } = data;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatsCard icon={Clock} label="Total Tours" value={stats.total} />
        <StatsCard icon={Users} label="Total Guests" value={stats.guests} />
        <StatsCard icon={DollarSign} label="Revenue" value={formatCurrency(stats.revenue)} />
        <StatsCard
          icon={CheckCircle2}
          label="Confirmed"
          value={stats.confirmed}
          className="border-success/20 bg-success/5"
        />
        <StatsCard
          icon={AlertCircle}
          label="Pending"
          value={stats.pending}
          className="border-warning/20 bg-warning/5"
        />
        <StatsCard
          icon={DollarSign}
          label="Paid"
          value={stats.paid}
          className="border-info/20 bg-info/5"
        />
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Today's Timeline
        </h2>
        <div className="space-y-0">
          {bookings.map((booking, index) => {
            const config = urgencyConfig[booking.urgency];
            const isLast = index === bookings.length - 1;

            return (
              <div key={booking.id} className="flex gap-4">
                {/* Timeline Dot & Line */}
                <div className="flex flex-col items-center pt-6">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full border-2 border-background",
                      config.dotClass,
                      booking.urgency === "critical" && "h-4 w-4 shadow-lg",
                      booking.urgency === "critical" && config.glowClass
                    )}
                  />
                  {!isLast && <div className="mt-1 w-0.5 flex-1 bg-border" style={{ minHeight: "1rem" }} />}
                </div>

                {/* Booking Card */}
                <div className="flex-1 pb-4">
                  <BookingCard
                    booking={booking}
                    orgSlug={orgSlug}
                    onConfirm={(id) => {
                      // TODO [Phase 7.2]: Wire booking confirmation via tRPC
                    }}
                    onSendPaymentLink={(id) => {
                      // TODO [Phase 7.2]: Wire send payment link via tRPC
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
