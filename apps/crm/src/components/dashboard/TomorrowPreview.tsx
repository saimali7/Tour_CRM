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
import { buildCommandCenterHref } from "@/lib/command-center-links";

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
            Tomorrow&apos;s Tour Plan
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
                href: buildCommandCenterHref({
                  orgSlug,
                  date: s.startsAt,
                }),
              }))}
              actionLabel="Open Command Center"
              actionHref={buildCommandCenterHref({
                orgSlug,
                date: data.date,
              })}
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
            />
          )}
        </div>
      )}

      {/* All Clear Message - Compact version */}
      {hasContent && !hasIssues && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/15 border border-success/30">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-success">
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
}: {
  type: "critical" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  items: Array<{ id: string; label: string; sublabel: string; href: string }>;
  actionLabel: string;
  actionHref: string;
}) {
  // Clean alert colors - subtle backgrounds with semantic icon/border colors
  const colors = {
    critical: {
      bg: "bg-card",
      border: "border-destructive/30 dark:border-destructive/20",
      icon: "text-destructive dark:text-destructive",
      text: "text-foreground",
    },
    warning: {
      bg: "bg-card",
      border: "border-warning/30 dark:border-warning/20",
      icon: "text-warning dark:text-warning",
      text: "text-foreground",
    },
    info: {
      bg: "bg-card",
      border: "border-info/30 dark:border-info/20",
      icon: "text-info dark:text-info",
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
