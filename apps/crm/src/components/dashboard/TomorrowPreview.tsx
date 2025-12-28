"use client";

import React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Route } from "next";
import {
  ChevronRight,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
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
    <section className={cn("space-y-3", className)}>
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tomorrow
          </h2>
          {hasContent && (
            <span className="text-xs text-muted-foreground">
              {data.stats.totalBookings} booking{data.stats.totalBookings !== 1 ? "s" : ""} · {data.stats.totalGuests} guests
            </span>
          )}
        </div>
        <Link
          href={`/org/${orgSlug}/calendar` as Route}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
        >
          Calendar
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Compressed Empty State */}
      {!hasContent && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border bg-muted/30">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No bookings for tomorrow</span>
        </div>
      )}

      {/* Compact Stats Row - Only show when has content */}
      {hasContent && (
      <div className="flex items-center gap-4 px-4 py-2 rounded-lg border border-border bg-card overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-primary tabular-nums">
            ${parseFloat(data.stats.expectedRevenue).toFixed(0)}
          </span>
          <span className="text-xs text-muted-foreground">expected</span>
        </div>
        <div className="h-4 w-px bg-border shrink-0" />
        <div className="flex items-center gap-2 shrink-0">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {data.stats.schedulesWithBookings}
          </span>
          <span className="text-xs text-muted-foreground">tours</span>
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

      {/* All Clear Message - Compact version */}
      {hasContent && !hasIssues && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            All set for tomorrow
          </span>
        </div>
      )}
    </section>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

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

export default TomorrowPreview;
