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
  AlertTriangle,
  DollarSign,
  Clock,
  UserX,
  CreditCard,
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

interface TomorrowPreviewData {
  date: Date | string;
  stats: {
    totalBookings: number;
    totalGuests: number;
    expectedRevenue: string;
    schedulesWithBookings: number;
  };
  schedulesNeedingGuides: Array<{
    scheduleId: string;
    tourName: string;
    startsAt: Date | string;
    bookedCount: number;
    maxParticipants: number;
  }>;
  pendingConfirmation: TomorrowBooking[];
  unpaidBookings: TomorrowBooking[];
  allBookings: TomorrowBooking[];
}

interface TomorrowPreviewProps {
  data: TomorrowPreviewData;
  orgSlug: string;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TomorrowPreview({
  data,
  orgSlug,
  className,
}: TomorrowPreviewProps) {
  const hasContent = data.stats.totalBookings > 0;
  const hasIssues = data.schedulesNeedingGuides.length > 0 ||
                   data.pendingConfirmation.length > 0 ||
                   data.unpaidBookings.length > 0;

  return (
    <section className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Tomorrow&apos;s Preview
        </h2>
        <Link
          href={`/org/${orgSlug}/calendar` as Route}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 hover:gap-1.5 transition-all"
        >
          View calendar
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Empty State - No bookings tomorrow */}
      {!hasContent && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No bookings for tomorrow
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {data.stats.schedulesWithBookings > 0
              ? `${data.stats.schedulesWithBookings} tour slots available`
              : "Schedule tours to start accepting bookings"
            }
          </p>
        </div>
      )}

      {/* Stats Summary Card - Only show when has content */}
      {hasContent && (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatItem
            icon={<Calendar className="h-4 w-4" />}
            value={data.stats.totalBookings}
            label="bookings"
          />
          <StatItem
            icon={<Users className="h-4 w-4" />}
            value={data.stats.totalGuests}
            label="guests"
          />
          <StatItem
            icon={<DollarSign className="h-4 w-4" />}
            value={`$${parseFloat(data.stats.expectedRevenue).toFixed(0)}`}
            label="expected"
            isHighlight
          />
          <StatItem
            icon={<Clock className="h-4 w-4" />}
            value={data.stats.schedulesWithBookings}
            label="tours"
          />
        </div>
      </div>
      )}

      {/* Action Items - Only show if there are issues AND has content */}
      {hasContent && hasIssues && (
        <div className="space-y-3">
          {/* Guides Needed */}
          {data.schedulesNeedingGuides.length > 0 && (
            <ActionCard
              type="critical"
              icon={<UserX className="h-4 w-4" />}
              title={`${data.schedulesNeedingGuides.length} tour${data.schedulesNeedingGuides.length > 1 ? 's' : ''} need guide`}
              items={data.schedulesNeedingGuides.map(s => ({
                id: s.scheduleId,
                label: s.tourName,
                sublabel: `${format(new Date(s.startsAt), "h:mm a")} · ${s.bookedCount} guests`,
                href: `/org/${orgSlug}/schedules/${s.scheduleId}`,
              }))}
              actionLabel="Assign guides"
              actionHref={`/org/${orgSlug}/guides`}
              orgSlug={orgSlug}
            />
          )}

          {/* Pending Confirmations */}
          {data.pendingConfirmation.length > 0 && (
            <ActionCard
              type="warning"
              icon={<AlertCircle className="h-4 w-4" />}
              title={`${data.pendingConfirmation.length} pending confirmation${data.pendingConfirmation.length > 1 ? 's' : ''}`}
              items={data.pendingConfirmation.slice(0, 3).map(b => ({
                id: b.bookingId,
                label: `${b.customer.firstName} ${b.customer.lastName}`,
                sublabel: `${b.tour.name} · $${parseFloat(b.total).toFixed(0)}`,
                href: `/org/${orgSlug}/bookings/${b.bookingId}`,
              }))}
              actionLabel="View all"
              actionHref={`/org/${orgSlug}/bookings?status=pending`}
              orgSlug={orgSlug}
            />
          )}

          {/* Unpaid Bookings */}
          {data.unpaidBookings.length > 0 && (
            <ActionCard
              type="info"
              icon={<CreditCard className="h-4 w-4" />}
              title={`${data.unpaidBookings.length} booking${data.unpaidBookings.length > 1 ? 's' : ''} unpaid`}
              items={data.unpaidBookings.slice(0, 3).map(b => ({
                id: b.bookingId,
                label: `${b.customer.firstName} ${b.customer.lastName}`,
                sublabel: `${b.tour.name} · $${parseFloat(b.total).toFixed(0)} due`,
                href: `/org/${orgSlug}/bookings/${b.bookingId}`,
              }))}
              actionLabel="View all"
              actionHref={`/org/${orgSlug}/bookings?payment=pending`}
              orgSlug={orgSlug}
            />
          )}
        </div>
      )}

      {/* All Clear Message - Only show when has content but no issues */}
      {hasContent && !hasIssues && (
        <div className="flex items-center gap-3 rounded-lg bg-muted border border-border px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-foreground">
              All set for tomorrow
            </p>
            <p className="text-xs text-muted-foreground">
              All guides assigned, bookings confirmed, payments received
            </p>
          </div>
        </div>
      )}

      {/* Bookings List - Only show when has content */}
      {hasContent && (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            All Bookings ({data.allBookings.length})
          </p>
        </div>
        <div className="divide-y divide-border">
          {data.allBookings.slice(0, 5).map((booking) => (
            <BookingRow
              key={booking.bookingId}
              booking={booking}
              slug={orgSlug}
            />
          ))}
        </div>
        {data.allBookings.length > 5 && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-center">
            <Link
              href={`/org/${orgSlug}/calendar` as Route}
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              +{data.allBookings.length - 5} more bookings
            </Link>
          </div>
        )}
      </div>
      )}
    </section>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatItem({
  icon,
  value,
  label,
  isHighlight = false,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  isHighlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "p-2 rounded-lg",
        isHighlight ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div>
        <p className={cn(
          "text-lg font-bold tabular-nums",
          isHighlight ? "text-primary" : "text-foreground"
        )}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ActionCard({
  type,
  icon,
  title,
  items,
  actionLabel,
  actionHref,
  orgSlug,
}: {
  type: "critical" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  items: Array<{ id: string; label: string; sublabel: string; href: string }>;
  actionLabel: string;
  actionHref: string;
  orgSlug: string;
}) {
  // Clean alert colors - subtle backgrounds with semantic icon/border colors
  const colors = {
    critical: {
      bg: "bg-card",
      border: "border-red-500/30 dark:border-red-500/20",
      icon: "text-red-500 dark:text-red-400",
      text: "text-foreground",
    },
    warning: {
      bg: "bg-card",
      border: "border-amber-500/30 dark:border-amber-500/20",
      icon: "text-amber-500 dark:text-amber-400",
      text: "text-foreground",
    },
    info: {
      bg: "bg-card",
      border: "border-blue-500/30 dark:border-blue-500/20",
      icon: "text-blue-500 dark:text-blue-400",
      text: "text-foreground",
    },
  };

  const c = colors[type];

  return (
    <div className={cn("rounded-lg border", c.bg, c.border)}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-inherit">
        <div className="flex items-center gap-2">
          <span className={c.icon}>{icon}</span>
          <span className={cn("text-sm font-medium", c.text)}>{title}</span>
        </div>
        <Link
          href={actionHref as Route}
          className={cn("text-xs font-medium", c.icon, "hover:underline")}
        >
          {actionLabel}
        </Link>
      </div>
      <div className="divide-y divide-inherit">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href as Route}
            className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate">{item.label}</p>
              <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function BookingRow({
  booking,
  slug,
}: {
  booking: TomorrowBooking;
  slug: string;
}) {
  const startTime = new Date(booking.schedule.startsAt);
  const isConfirmed = booking.status === "confirmed";
  const isPaid = booking.paymentStatus === "paid";

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

      {/* Customer + Tour */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">
          {booking.customer.firstName} {booking.customer.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {booking.tour.name} · {booking.participants} guests
        </p>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isConfirmed && isPaid ? (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            {!isConfirmed ? "Pending" : "Unpaid"}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

export default TomorrowPreview;
