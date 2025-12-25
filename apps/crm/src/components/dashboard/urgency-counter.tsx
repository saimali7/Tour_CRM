"use client";

import React, { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, Users, DollarSign, Zap, Send } from "lucide-react";
import { differenceInHours, differenceInMinutes, isToday, isTomorrow, format } from "date-fns";

// =============================================================================
// TYPES
// =============================================================================

interface ScheduleItem {
  scheduleId: string;
  tourName: string;
  startsAt: Date | string;
  bookedCount: number;
  maxParticipants: number;
  pricePerPerson?: number;
}

interface UrgencyMetrics {
  hoursUntilFirstCritical: number;
  minutesUntilFirstCritical: number;
  criticalSchedules: ScheduleItem[];
  totalEmptySlots: number;
  potentialRevenueLoss: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatTimeUntil(hours: number, minutes: number): string {
  if (hours < 1) {
    return `${minutes}m`;
  }
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days}d`;
  }
  return `${days}d ${remainingHours}h`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface UrgencyCounterProps {
  className?: string;
  onBoostClick?: () => void;
  onDiscountClick?: () => void;
}

export function UrgencyCounter({
  className,
  onBoostClick,
  onDiscountClick,
}: UrgencyCounterProps) {
  // Fetch upcoming schedules from operations dashboard
  const { data: operationsData, isLoading } = trpc.dashboard.getOperationsDashboard.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  // Calculate urgency metrics from the data
  const urgencyMetrics = useMemo((): UrgencyMetrics | null => {
    if (!operationsData?.upcomingSchedules) return null;

    const now = new Date();
    const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Filter schedules that need attention (< 50% booked, within 48h)
    const criticalSchedules = operationsData.upcomingSchedules
      .filter((schedule) => {
        const startsAt = new Date(schedule.startsAt);
        const utilization = schedule.maxParticipants > 0
          ? (schedule.bookedCount / schedule.maxParticipants) * 100
          : 0;
        return startsAt <= next48Hours && utilization < 50;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    if (criticalSchedules.length === 0) return null;

    const firstSchedule = criticalSchedules[0];
    if (!firstSchedule) return null;

    const firstCritical = new Date(firstSchedule.startsAt);
    const hoursUntil = Math.max(0, differenceInHours(firstCritical, now));
    const minutesUntil = Math.max(0, differenceInMinutes(firstCritical, now));

    // Calculate total empty slots and potential revenue
    const totalEmptySlots = criticalSchedules.reduce(
      (sum, s) => sum + (s.maxParticipants - s.bookedCount),
      0
    );

    // Estimate $50 average per person if no price data
    const avgPrice = 50;
    const potentialRevenueLoss = totalEmptySlots * avgPrice;

    return {
      hoursUntilFirstCritical: hoursUntil,
      minutesUntilFirstCritical: minutesUntil,
      criticalSchedules,
      totalEmptySlots,
      potentialRevenueLoss,
    };
  }, [operationsData]);

  if (isLoading) {
    return <UrgencyCounterSkeleton />;
  }

  if (!urgencyMetrics || urgencyMetrics.criticalSchedules.length === 0) {
    return null; // Don't show if no urgency
  }

  const { hoursUntilFirstCritical, minutesUntilFirstCritical, criticalSchedules, totalEmptySlots, potentialRevenueLoss } = urgencyMetrics;

  // Determine urgency level
  const isVeryCritical = hoursUntilFirstCritical < 12;
  const isCritical = hoursUntilFirstCritical < 24;

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-5 transition-all",
        isVeryCritical
          ? "card-danger border-red-300 dark:border-red-700"
          : isCritical
            ? "card-warning border-amber-300 dark:border-amber-700"
            : "card-info border-blue-200 dark:border-blue-700",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main Content */}
        <div className="flex-1">
          {/* Countdown Header */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className={cn(
                "p-1.5 rounded-lg",
                isVeryCritical
                  ? "bg-muted"
                  : isCritical
                    ? "bg-muted"
                    : "bg-muted"
              )}
            >
              <Clock
                className={cn(
                  "h-4 w-4",
                  isVeryCritical
                    ? "text-red-600 dark:text-red-400"
                    : isCritical
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-blue-600 dark:text-blue-400",
                  isVeryCritical && ""
                )}
              />
            </div>
            <span
              className={cn(
                "text-2xl font-bold tabular-nums tracking-tight",
                isVeryCritical
                  ? "text-red-700 dark:text-red-300"
                  : isCritical
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-blue-700 dark:text-blue-300"
              )}
            >
              {formatTimeUntil(hoursUntilFirstCritical, minutesUntilFirstCritical % 60)}
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              to fill tours
            </span>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-medium">{criticalSchedules.length}</span>
              <span>tours need bookings</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium">{totalEmptySlots}</span>
              <span>empty slots</span>
            </div>
          </div>

          {/* Revenue at Risk */}
          <div className="flex items-center gap-1.5 mt-2 text-sm">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span
              className={cn(
                "font-semibold",
                isVeryCritical
                  ? "text-red-600 dark:text-red-400"
                  : isCritical
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-blue-600 dark:text-blue-400"
              )}
            >
              {formatCurrency(potentialRevenueLoss)}
            </span>
            <span className="text-muted-foreground">potential revenue at risk</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onDiscountClick}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              "bg-white dark:bg-black/20 border",
              "hover:-translate-y-0.5 active:scale-[0.98]",
              isVeryCritical
                ? "border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                : isCritical
                  ? "border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                  : "border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
            )}
          >
            <Send className="h-3.5 w-3.5" />
            Send Discount
          </button>
          <button
            onClick={onBoostClick}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              isVeryCritical
                ? "bg-red-600 hover:bg-red-700 text-white"
                : isCritical
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white",
              "hover:-translate-y-0.5 active:scale-[0.98]"
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Boost Tours
          </button>
        </div>
      </div>

      {/* Tours Preview */}
      {criticalSchedules.length > 0 && (
        <div className="mt-4 pt-3 border-t border-inherit">
          <div className="flex flex-wrap gap-2">
            {criticalSchedules.slice(0, 3).map((schedule) => {
              const startsAt = new Date(schedule.startsAt);
              const timeLabel = isToday(startsAt)
                ? `Today ${format(startsAt, "h:mm a")}`
                : isTomorrow(startsAt)
                  ? `Tomorrow ${format(startsAt, "h:mm a")}`
                  : format(startsAt, "EEE h:mm a");

              return (
                <div
                  key={schedule.scheduleId}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/50 dark:bg-black/20 text-xs"
                >
                  <span className="font-medium truncate max-w-[120px]">
                    {schedule.tourName}
                  </span>
                  <span className="text-muted-foreground">{timeLabel}</span>
                  <span
                    className={cn(
                      "font-semibold",
                      schedule.bookedCount === 0 ? "text-red-600" : "text-amber-600"
                    )}
                  >
                    {schedule.bookedCount}/{schedule.maxParticipants}
                  </span>
                </div>
              );
            })}
            {criticalSchedules.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-1.5">
                +{criticalSchedules.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function UrgencyCounterSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 skeleton rounded-lg" />
            <div className="h-8 w-16 skeleton rounded" />
            <div className="h-4 w-24 skeleton rounded" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-32 skeleton rounded" />
            <div className="h-4 w-28 skeleton rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-9 w-28 skeleton rounded-lg" />
          <div className="h-9 w-28 skeleton rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default UrgencyCounter;
