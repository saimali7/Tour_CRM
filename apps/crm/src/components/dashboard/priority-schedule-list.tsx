"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Route } from "next";
import {
  Clock,
  Users,
  AlertTriangle,
  ChevronRight,
  Calendar,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  format,
  isToday,
  isTomorrow,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";

// =============================================================================
// TYPES
// =============================================================================

interface ScheduleItem {
  scheduleId: string;
  tourName: string;
  startsAt: Date | string;
  endsAt?: Date | string;
  bookedCount: number;
  maxParticipants: number;
  guideName?: string | null;
  hasUnconfirmedGuide: boolean;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function calculatePriority(schedule: ScheduleItem): number {
  const now = new Date();
  const startsAt = new Date(schedule.startsAt);
  const hoursUntil = Math.max(0, differenceInHours(startsAt, now));

  let score = 0;

  // Time urgency (exponential - more urgent = higher score)
  if (hoursUntil <= 6) score += 100;
  else if (hoursUntil <= 12) score += 80;
  else if (hoursUntil <= 24) score += 60;
  else if (hoursUntil <= 48) score += 40;
  else score += Math.max(0, 30 - hoursUntil);

  // Capacity concern (inverse of utilization)
  const utilization =
    schedule.maxParticipants > 0
      ? (schedule.bookedCount / schedule.maxParticipants) * 100
      : 0;

  if (utilization === 0) score += 50;
  else if (utilization < 30) score += 40;
  else if (utilization < 50) score += 25;
  else if (utilization < 80) score += 10;
  // High utilization = low priority (they're fine)

  // Guide assignment
  if (!schedule.guideName) score += 30;
  if (schedule.hasUnconfirmedGuide) score += 20;

  return score;
}

function getUtilization(booked: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((booked / max) * 100);
}

function getCapacityColor(utilization: number): string {
  if (utilization >= 80) return "bg-emerald-500";
  if (utilization >= 50) return "bg-primary";
  if (utilization >= 30) return "bg-amber-500";
  return "bg-red-500";
}

function getUrgencyLabel(hoursUntil: number): string | null {
  if (hoursUntil <= 1) return "Starting soon!";
  if (hoursUntil <= 6) return `Fill in ${hoursUntil}h`;
  if (hoursUntil <= 12) return `Fill in ${hoursUntil}h`;
  if (hoursUntil <= 24) return `Fill in ${hoursUntil}h`;
  return null;
}

function getTimeLabel(startsAt: Date): { day: string; time: string } {
  if (isToday(startsAt)) {
    return { day: "Today", time: format(startsAt, "h:mm a") };
  }
  if (isTomorrow(startsAt)) {
    return { day: "Tomorrow", time: format(startsAt, "h:mm a") };
  }
  return { day: format(startsAt, "EEE, MMM d"), time: format(startsAt, "h:mm a") };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface PriorityScheduleListProps {
  schedules: ScheduleItem[];
  slug: string;
  maxItems?: number;
  className?: string;
  title?: string;
  emptyMessage?: string;
}

export function PriorityScheduleList({
  schedules,
  slug,
  maxItems = 5,
  className,
  title = "Needs Attention",
  emptyMessage = "No upcoming tours need attention",
}: PriorityScheduleListProps) {
  // Sort schedules by priority score
  const sortedSchedules = useMemo(() => {
    return [...schedules]
      .map((schedule) => ({
        ...schedule,
        priority: calculatePriority(schedule),
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxItems);
  }, [schedules, maxItems]);

  if (sortedSchedules.length === 0) {
    return (
      <EmptyState
        message={emptyMessage}
        slug={slug}
        className={className}
      />
    );
  }

  return (
    <section className={cn(className)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          {title}
        </h2>
        <Link
          href={`/org/${slug}/calendar` as Route}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 hover:gap-1.5 transition-all"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {sortedSchedules.map((schedule, idx) => (
            <PriorityScheduleRow
              key={schedule.scheduleId}
              schedule={schedule}
              slug={slug}
              index={idx}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function PriorityScheduleRow({
  schedule,
  slug,
  index,
}: {
  schedule: ScheduleItem & { priority: number };
  slug: string;
  index: number;
}) {
  const startsAt = new Date(schedule.startsAt);
  const hoursUntil = differenceInHours(startsAt, new Date());
  const utilization = getUtilization(schedule.bookedCount, schedule.maxParticipants);
  const { day, time } = getTimeLabel(startsAt);
  const urgencyLabel = getUrgencyLabel(hoursUntil);

  // Determine status color based on priority
  const isHighPriority = schedule.priority >= 80;
  const isMediumPriority = schedule.priority >= 50;

  const statusColor = isHighPriority
    ? "bg-red-500"
    : isMediumPriority
      ? "bg-amber-500"
      : "bg-blue-500";

  return (
    <Link
      href={`/org/${slug}/schedules/${schedule.scheduleId}` as Route}
      className={cn(
        "flex items-center gap-4 px-4 py-3 transition-colors group"
      )}
    >
      {/* Priority Indicator */}
      <div className={cn("w-1 h-12 rounded-full flex-shrink-0", statusColor)} />

      {/* Time Column */}
      <div className="w-20 flex-shrink-0">
        <p className="text-xs text-muted-foreground">{day}</p>
        <p className="text-sm font-mono tabular-nums font-medium">{time}</p>
        {urgencyLabel && (
          <p
            className={cn(
              "text-[10px] font-semibold mt-0.5",
              isHighPriority
                ? "text-red-600 dark:text-red-400"
                : "text-amber-600 dark:text-amber-400"
            )}
          >
            {urgencyLabel}
          </p>
        )}
      </div>

      {/* Tour Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {schedule.tourName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {schedule.guideName ? (
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
              {schedule.guideName}
            </span>
          ) : (
            <span className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-0.5">
              <AlertTriangle className="h-3 w-3" />
              No guide
            </span>
          )}
        </div>
      </div>

      {/* Capacity Bar */}
      <div className="w-24 flex-shrink-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            {schedule.bookedCount}/{schedule.maxParticipants}
          </span>
          <span
            className={cn(
              "font-medium",
              utilization < 30
                ? "text-red-600 dark:text-red-400"
                : utilization < 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
            )}
          >
            {utilization}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              getCapacityColor(utilization)
            )}
            style={{ width: `${Math.max(utilization, 4)}%` }}
          />
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
    </Link>
  );
}

function EmptyState({
  message,
  slug,
  className,
}: {
  message: string;
  slug: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 text-center",
        className
      )}
    >
      <div className="flex justify-center mb-3">
        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        {message}
      </p>
      <Link
        href={`/org/${slug}/calendar` as Route}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        View full calendar
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export default PriorityScheduleList;
