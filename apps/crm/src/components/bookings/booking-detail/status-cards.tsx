"use client";

import { Check, Clock, X, Ban, CreditCard } from "lucide-react";
import { Button } from "@tour/ui";
import { cn } from "@/lib/utils";
import type { BookingStatus, PaymentStatus, BalanceInfo } from "./types";

interface StatusCardsProps {
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  balanceInfo: BalanceInfo | null;
  onCollectPayment?: () => void;
  isPaymentLoading?: boolean;
  className?: string;
}

/**
 * Status Cards - Compact Inline Version
 *
 * A single-row display showing booking status and balance due.
 * Designed to minimize vertical space while maintaining clarity.
 */
export function StatusCards({
  bookingStatus,
  paymentStatus,
  balanceInfo,
  onCollectPayment,
  isPaymentLoading,
  className,
}: StatusCardsProps) {
  const balanceDue = parseFloat(balanceInfo?.balance || "0");
  const totalPaid = parseFloat(balanceInfo?.totalPaid || "0");
  const total = parseFloat(balanceInfo?.total || "0");
  const paidPercentage = total > 0 ? Math.round((totalPaid / total) * 100) : 0;

  // Status configuration
  const statusConfig: Record<BookingStatus, {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    textClass: string;
    iconBgClass: string;
    dotClass: string;
  }> = {
    confirmed: {
      label: "Confirmed",
      icon: Check,
      textClass: "text-emerald-600 dark:text-emerald-400",
      iconBgClass: "bg-emerald-500",
      dotClass: "bg-emerald-500",
    },
    pending: {
      label: "Pending",
      icon: Clock,
      textClass: "text-amber-600 dark:text-amber-400",
      iconBgClass: "bg-amber-500",
      dotClass: "bg-amber-500",
    },
    cancelled: {
      label: "Cancelled",
      icon: X,
      textClass: "text-red-600 dark:text-red-400",
      iconBgClass: "bg-red-500",
      dotClass: "bg-red-500",
    },
    completed: {
      label: "Completed",
      icon: Check,
      textClass: "text-slate-600 dark:text-slate-400",
      iconBgClass: "bg-slate-500",
      dotClass: "bg-slate-500",
    },
    no_show: {
      label: "No Show",
      icon: Ban,
      textClass: "text-slate-500 dark:text-slate-500",
      iconBgClass: "bg-slate-400",
      dotClass: "bg-slate-400",
    },
  };

  const status = statusConfig[bookingStatus];
  const StatusIcon = status.icon;

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border border-border bg-card",
      className
    )}>
      {/* Left: Status */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full",
          status.iconBgClass
        )}>
          <StatusIcon className="h-3 w-3 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </span>
          <span className={cn("text-sm font-semibold leading-tight", status.textClass)}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Center: Progress bar (only if partial payment) */}
      {total > 0 && balanceDue > 0 && paidPercentage > 0 && (
        <div className="hidden sm:flex items-center gap-2 flex-1 max-w-[200px]">
          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${paidPercentage}%` }}
            />
          </div>
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground whitespace-nowrap">
            {paidPercentage}%
          </span>
        </div>
      )}

      {/* Right: Balance */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Balance
          </span>
          <span className={cn(
            "text-lg font-bold tabular-nums leading-tight",
            balanceDue > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
          )}>
            ${balanceDue.toFixed(2)}
          </span>
        </div>

        {/* Collect button or Paid badge */}
        {balanceDue > 0 && onCollectPayment ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onCollectPayment}
            disabled={isPaymentLoading}
            className={cn(
              "h-7 text-xs gap-1.5",
              "border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800",
              "dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
            )}
          >
            <CreditCard className="h-3 w-3" />
            Collect
          </Button>
        ) : balanceDue === 0 ? (
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-md",
            "text-[10px] font-semibold",
            "bg-emerald-100 text-emerald-700",
            "dark:bg-emerald-900/50 dark:text-emerald-400"
          )}>
            <Check className="h-3 w-3" />
            Paid
          </span>
        ) : null}
      </div>
    </div>
  );
}
