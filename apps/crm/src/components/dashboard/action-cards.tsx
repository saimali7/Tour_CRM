"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  UserX,
  UserCheck,
  Clock,
  ChevronRight,
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
}

interface ActionCardsProps {
  pendingPayments: { count: number; amount: number };
  toursNeedingGuides: number;
  toursWithGuides: number;
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
  toursWithGuides,
  unconfirmedBookings,
  orgSlug,
  className,
}: ActionCardsProps) {
  // Always show all 3 cards
  const cards: ActionCardData[] = [
    // Card 1: Payments Due
    {
      id: "pending-payments",
      label: "Payments Due",
      value: pendingPayments.count > 0 ? formatCurrency(pendingPayments.amount) : "$0",
      subtext: pendingPayments.count > 0
        ? `${pendingPayments.count} booking${pendingPayments.count !== 1 ? "s" : ""}`
        : "All paid",
      icon: <DollarSign className="h-5 w-5" />,
      href: `/org/${orgSlug}/bookings?payment=pending`,
      variant: pendingPayments.amount > 500 ? "danger" : pendingPayments.count > 0 ? "warning" : "success",
    },
    // Card 2: Guide Assignment Status
    toursNeedingGuides > 0
      ? {
        id: "needs-guides",
        label: "Need Guide",
        value: toursNeedingGuides,
        subtext: `upcoming tour${toursNeedingGuides !== 1 ? "s" : ""}`,
        icon: <UserX className="h-5 w-5" />,
        href: `/org/${orgSlug}/calendar?filter=needs-guide`,
        variant: "danger" as const,
      }
      : {
        id: "guides-assigned",
        label: "Guides Assigned",
        value: toursWithGuides,
        subtext: toursWithGuides > 0
          ? `tour${toursWithGuides !== 1 ? "s" : ""} ready`
          : "No upcoming tours",
        icon: <UserCheck className="h-5 w-5" />,
        href: `/org/${orgSlug}/calendar`,
        variant: "success" as const,
      },
    // Card 3: Awaiting Confirmation
    {
      id: "unconfirmed",
      label: "Awaiting Confirmation",
      value: unconfirmedBookings,
      subtext: unconfirmedBookings > 0
        ? `booking${unconfirmedBookings !== 1 ? "s" : ""}`
        : "All confirmed",
      icon: <Clock className="h-5 w-5" />,
      href: `/org/${orgSlug}/bookings?status=pending`,
      variant: unconfirmedBookings > 0 ? "warning" : "success",
    },
  ];

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
  // shadcn-style: White background with colored left border accent
  // Uses CSS variables which respect the app's dark mode class
  const variantStyles = {
    danger: {
      container: "bg-card border border-border",
      icon: "bg-red-100 text-red-600",
      value: "text-foreground",
      label: "text-muted-foreground",
      urgent: true,
    },
    warning: {
      container: "bg-card border border-border",
      icon: "bg-amber-100 text-amber-600",
      value: "text-foreground",
      label: "text-muted-foreground",
      urgent: false,
    },
    info: {
      container: "bg-card border border-border",
      icon: "bg-blue-100 text-blue-600",
      value: "text-foreground",
      label: "text-muted-foreground",
      urgent: false,
    },
    success: {
      container: "bg-card border border-border",
      icon: "bg-emerald-100 text-emerald-600",
      value: "text-foreground",
      label: "text-muted-foreground",
      urgent: false,
    },
  };

  const styles = variantStyles[variant];

  return (
    <Link
      href={href as Route}
      className={cn(
        "group relative rounded-xl p-4 transition-all duration-200",
        "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
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
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

export default ActionCards;
