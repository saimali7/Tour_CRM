"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  UserX,
  Clock,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface ActionCardData {
  id: string;
  label: string;
  value: number | string;
  subtext?: string;
  icon: React.ReactNode;
  href: string;
  variant: "warning" | "danger" | "info" | "success";
  priority: number; // Lower = higher priority
}

interface ActionCardsProps {
  pendingPayments: { count: number; amount: number };
  toursNeedingGuides: number;
  unconfirmedBookings: number;
  orgSlug: string;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ActionCards({
  pendingPayments,
  toursNeedingGuides,
  unconfirmedBookings,
  orgSlug,
  className,
}: ActionCardsProps) {
  // Build action cards from data
  const cards: ActionCardData[] = [];

  // Pending payments - show if there are any
  if (pendingPayments.count > 0) {
    cards.push({
      id: "pending-payments",
      label: "Payments Due",
      value: formatCurrency(pendingPayments.amount),
      subtext: `${pendingPayments.count} booking${pendingPayments.count !== 1 ? "s" : ""}`,
      icon: <DollarSign className="h-5 w-5" />,
      href: `/org/${orgSlug}/bookings?payment=pending`,
      variant: pendingPayments.amount > 500 ? "danger" : "warning",
      priority: 1,
    });
  }

  // Tours needing guides - urgent
  if (toursNeedingGuides > 0) {
    cards.push({
      id: "needs-guides",
      label: "Need Guide",
      value: toursNeedingGuides,
      subtext: "upcoming tour" + (toursNeedingGuides !== 1 ? "s" : ""),
      icon: <UserX className="h-5 w-5" />,
      href: `/org/${orgSlug}/calendar?filter=needs-guide`,
      variant: "danger",
      priority: 0, // Highest priority
    });
  }

  // Unconfirmed bookings
  if (unconfirmedBookings > 0) {
    cards.push({
      id: "unconfirmed",
      label: "Awaiting Confirmation",
      value: unconfirmedBookings,
      subtext: "booking" + (unconfirmedBookings !== 1 ? "s" : ""),
      icon: <Clock className="h-5 w-5" />,
      href: `/org/${orgSlug}/bookings?status=pending`,
      variant: "warning",
      priority: 2,
    });
  }

  // Sort by priority (lower = higher priority)
  cards.sort((a, b) => a.priority - b.priority);

  // If no action items, show success state
  if (cards.length === 0) {
    return null; // Let the parent handle "all clear" state
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-3", className)}>
      {cards.map((card) => (
        <ActionCard key={card.id} {...card} />
      ))}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ActionCard({
  label,
  value,
  subtext,
  icon,
  href,
  variant,
}: ActionCardData) {
  const variantStyles = {
    danger: {
      container: "border-red-200 bg-gradient-to-br from-red-50 to-orange-50/50 dark:border-red-900/50 dark:from-red-950/30 dark:to-orange-950/20",
      icon: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
      value: "text-red-700 dark:text-red-300",
      label: "text-red-900/70 dark:text-red-200/70",
    },
    warning: {
      container: "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-yellow-950/20",
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
      value: "text-amber-700 dark:text-amber-300",
      label: "text-amber-900/70 dark:text-amber-200/70",
    },
    info: {
      container: "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:border-blue-900/50 dark:from-blue-950/30 dark:to-indigo-950/20",
      icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
      value: "text-blue-700 dark:text-blue-300",
      label: "text-blue-900/70 dark:text-blue-200/70",
    },
    success: {
      container: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-teal-950/20",
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
      value: "text-emerald-700 dark:text-emerald-300",
      label: "text-emerald-900/70 dark:text-emerald-200/70",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Link
      href={href as Route}
      className={cn(
        "group relative rounded-xl border p-4 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        styles.container
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", styles.label)}>
            {label}
          </p>
          <p className={cn("text-2xl font-bold tabular-nums tracking-tight", styles.value)}>
            {value}
          </p>
          {subtext && (
            <p className={cn("text-sm mt-0.5", styles.label)}>
              {subtext}
            </p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg", styles.icon)}>
          {icon}
        </div>
      </div>

      {/* Hover indicator */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className={cn("h-4 w-4", styles.value)} />
      </div>
    </Link>
  );
}

export default ActionCards;
