"use client";

import { useMemo } from "react";
import {
  CheckCircle,
  CreditCard,
  UserPlus,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@tour/ui";
import { cn } from "@/lib/utils";
import type { BookingStatus, BalanceInfo, BookingGuideAssignment } from "./types";

interface ActionItem {
  id: string;
  priority: 1 | 2 | 3;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  actionLabel: string;
  onClick: () => void;
  variant: "confirm" | "payment" | "guide";
}

interface ActionItemsCardProps {
  bookingStatus: BookingStatus;
  balanceInfo: BalanceInfo | null;
  guideAssignments: BookingGuideAssignment[] | null | undefined;
  onConfirm: () => void;
  onCollectPayment: () => void;
  onAssignGuide: () => void;
  isConfirmLoading?: boolean;
  className?: string;
}

/**
 * Action Items Card - Compact Inline Version
 *
 * A compact horizontal display of pending action items.
 * Shows only when there are actions needed, disappears when resolved.
 */
export function ActionItemsCard({
  bookingStatus,
  balanceInfo,
  guideAssignments,
  onConfirm,
  onCollectPayment,
  onAssignGuide,
  isConfirmLoading,
  className,
}: ActionItemsCardProps) {
  const balanceDue = parseFloat(balanceInfo?.balance || "0");
  const hasGuide = guideAssignments && guideAssignments.length > 0;

  // Build action items based on current state
  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];

    if (bookingStatus === "pending") {
      items.push({
        id: "confirm",
        priority: 1,
        icon: CheckCircle,
        label: "Confirm",
        actionLabel: "Confirm",
        onClick: onConfirm,
        variant: "confirm",
      });
    }

    if (balanceDue > 0 && bookingStatus !== "cancelled") {
      items.push({
        id: "payment",
        priority: 2,
        icon: CreditCard,
        label: `$${balanceDue.toFixed(0)} due`,
        actionLabel: "Collect",
        onClick: onCollectPayment,
        variant: "payment",
      });
    }

    if (!hasGuide && bookingStatus !== "cancelled" && bookingStatus !== "completed") {
      items.push({
        id: "guide",
        priority: 3,
        icon: UserPlus,
        label: "No guide",
        actionLabel: "Assign",
        onClick: onAssignGuide,
        variant: "guide",
      });
    }

    return items.sort((a, b) => a.priority - b.priority);
  }, [bookingStatus, balanceDue, hasGuide, onConfirm, onCollectPayment, onAssignGuide]);

  // Don't render if no action items
  if (actionItems.length === 0) return null;

  // Get variant styles
  const getVariantStyles = (variant: ActionItem["variant"]) => {
    switch (variant) {
      case "confirm":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
          border: "border-emerald-200 dark:border-emerald-800",
          text: "text-emerald-700 dark:text-emerald-400",
          button: "bg-emerald-600 hover:bg-emerald-700 text-white",
        };
      case "payment":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border-amber-200 dark:border-amber-800",
          text: "text-amber-700 dark:text-amber-400",
          button: "bg-amber-600 hover:bg-amber-700 text-white",
        };
      case "guide":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/30",
          border: "border-blue-200 dark:border-blue-800",
          text: "text-blue-700 dark:text-blue-400",
          button: "bg-blue-600 hover:bg-blue-700 text-white",
        };
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Alert icon and count */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/50">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          {actionItems.length} action{actionItems.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Action Items - Horizontal chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {actionItems.map((item) => {
          const styles = getVariantStyles(item.variant);
          const Icon = item.icon;
          const isLoading = item.variant === "confirm" && isConfirmLoading;

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              disabled={isLoading}
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
