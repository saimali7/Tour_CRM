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
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-success dark:bg-success/30 border border-success dark:border-success",
        className
      )}>
        <CheckCircle className="h-4 w-4 text-success dark:text-success" />
        <span className="text-sm font-medium text-success dark:text-success">
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
          bg: "bg-warning dark:bg-warning/30",
          border: "border-warning dark:border-warning",
          text: "text-warning dark:text-warning",
          icon: Clock,
        };
      case "payment":
        return {
          bg: "bg-success dark:bg-success/30",
          border: "border-success dark:border-success",
          text: "text-success dark:text-success",
          icon: CreditCard,
        };
      case "guide":
        return {
          bg: "bg-info dark:bg-info/30",
          border: "border-info dark:border-info",
          text: "text-info dark:text-info",
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
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-warning dark:bg-warning/50">
        <AlertCircle className="h-3.5 w-3.5 text-warning dark:text-warning" />
        <span className="text-xs font-semibold text-warning dark:text-warning">
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
