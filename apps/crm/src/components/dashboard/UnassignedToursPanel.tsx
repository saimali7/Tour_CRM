"use client";

import { AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import Link from "next/link";
import type { Route } from "next";
import { QuickGuideAssign } from "@/components/guides/QuickGuideAssign";

interface ScheduleItem {
  scheduleId: string;
  tourName: string;
  startsAt: Date | string;
  endsAt?: Date | string;
  bookedCount: number;
  maxParticipants: number;
  guideName?: string | null;
  guideId?: string | null;
  hasUnconfirmedGuide: boolean;
  isOutsourced?: boolean;
  outsourcedGuideName?: string | null;
  guidesRequired?: number;
  guidesAssigned?: number;
}

interface UnassignedToursPanelProps {
  schedules: ScheduleItem[];
  orgSlug: string;
  maxItems?: number;
}

export function UnassignedToursPanel({
  schedules,
  orgSlug,
  maxItems = 5,
}: UnassignedToursPanelProps) {
  // Filter to only unassigned schedules
  const unassignedSchedules = schedules
    .filter((s) => s.hasUnconfirmedGuide || !s.guideName)
    .slice(0, maxItems);

  if (unassignedSchedules.length === 0) {
    return null;
  }

  const formatTimeLabel = (date: Date | string) => {
    const d = new Date(date);
    return format(d, "h:mm a");
  };

  const getDayLabel = (date: Date | string) => {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEE, MMM d");
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Needs Guide ({unassignedSchedules.length})
        </h2>
        <Link
          href={`/org/${orgSlug}/guides` as Route}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
        >
          Manage guides
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="rounded-xl border-2 border-destructive/20 bg-destructive/5 overflow-hidden divide-y divide-destructive/10">
        {unassignedSchedules.map((schedule) => {
          const startsAt = new Date(schedule.startsAt);
          const endsAt = schedule.endsAt
            ? new Date(schedule.endsAt)
            : new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

          return (
            <div
              key={schedule.scheduleId}
              className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
            >
              {/* Tour Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/org/${orgSlug}/schedules/${schedule.scheduleId}` as Route}
                  className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors block"
                >
                  {schedule.tourName}
                </Link>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getDayLabel(schedule.startsAt)} · {formatTimeLabel(schedule.startsAt)}
                  </span>
                  <span>·</span>
                  <span>
                    {schedule.bookedCount}/{schedule.maxParticipants} guests
                  </span>
                </div>
              </div>

              {/* Quick Assign Button */}
              <QuickGuideAssign
                scheduleId={schedule.scheduleId}
                guidesRequired={schedule.guidesRequired ?? 1}
                guidesAssigned={schedule.guidesAssigned ?? 0}
              />
            </div>
          );
        })}
      </div>

      {unassignedSchedules.length >= maxItems && (
        <div className="mt-2 text-center">
          <Link
            href={`/org/${orgSlug}/calendar` as Route}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all schedules →
          </Link>
        </div>
      )}
    </section>
  );
}
