"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  UserPlus,
  ChevronRight,
} from "lucide-react";

interface ActionItem {
  id: string;
  label: string;
  count?: number;
  amount?: string;
  href: string;
  variant: "confirm" | "payment" | "guide" | "success";
}

interface ActionBarProps {
  unconfirmedBookings: number;
  pendingPayments: { count: number; amount: number };
  toursNeedingGuides: number;
  orgSlug: string;
  className?: string;
}

/**
 * Action Bar - Dashboard Action Items
 *
 * Compact horizontal display of pending actions, following the same
 * design pattern as the booking detail page action items.
 *
 * Principles:
 * - Actions not data: "Confirm 30 bookings" not "30 pending"
 * - Direct links: Each chip navigates to resolution
 * - Disappears when resolved: No empty states
 */
export function ActionBar({
  unconfirmedBookings,
  pendingPayments,
  toursNeedingGuides,
  orgSlug,
  className,
}: ActionBarProps) {
  // Build action items based on current state
  const actionItems: ActionItem[] = [];

  // Only add items that need attention
  if (unconfirmedBookings > 0) {
    actionItems.push({
      id: "confirm",
      label: `Confirm ${unconfirmedBookings}`,
      count: unconfirmedBookings,
      href: `/org/${orgSlug}/bookings?status=pending`,
      variant: "confirm",
    });
  }

  if (pendingPayments.count > 0) {
    actionItems.push({
      id: "payment",
      label: `Collect $${Math.round(pendingPayments.amount).toLocaleString()}`,
      count: pendingPayments.count,
      href: `/org/${orgSlug}/bookings?payment=pending`,
      variant: "payment",
    });
  }

  if (toursNeedingGuides > 0) {
    actionItems.push({
      id: "guide",
      label: `Assign ${toursNeedingGuides} guide${toursNeedingGuides !== 1 ? "s" : ""}`,
      count: toursNeedingGuides,
      href: `/org/${orgSlug}/guides`,
      variant: "guide",
    });
  }

  // If nothing needs attention, show success state
  if (actionItems.length === 0) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800",
        className
      )}>
        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          All caught up - no pending actions
        </span>
      </div>
    );
  }

  // Get variant styles (matching booking detail page)
  const getVariantStyles = (variant: ActionItem["variant"]) => {
    switch (variant) {
      case "confirm":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border-amber-200 dark:border-amber-800",
          text: "text-amber-700 dark:text-amber-400",
          icon: Clock,
        };
      case "payment":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
          border: "border-emerald-200 dark:border-emerald-800",
          text: "text-emerald-700 dark:text-emerald-400",
          icon: CreditCard,
        };
      case "guide":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/30",
          border: "border-blue-200 dark:border-blue-800",
          text: "text-blue-700 dark:text-blue-400",
          icon: UserPlus,
        };
      default:
        return {
          bg: "bg-muted",
          border: "border-border",
          text: "text-foreground",
          icon: AlertCircle,
        };
    }
  };

  const totalActions = actionItems.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Action count badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          {actionItems.length} action{actionItems.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Action chips */}
      {actionItems.map((item) => {
        const styles = getVariantStyles(item.variant);
        const Icon = styles.icon;

        return (
          <Link
            key={item.id}
            href={item.href as Route}
            className={cn(
              "group flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150",
              "hover:shadow-sm active:scale-[0.98]",
              styles.bg,
              styles.border
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", styles.text)} />
            <span className={cn("text-xs font-medium", styles.text)}>
              {item.label}
            </span>
            <ChevronRight className={cn(
              "h-3 w-3 transition-transform group-hover:translate-x-0.5",
              styles.text
            )} />
          </Link>
        );
      })}
    </div>
  );
}
