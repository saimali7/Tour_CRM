"use client";

import { trpc } from "@/lib/trpc";
import { Calendar, Users, User, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

interface TourSchedulePreviewProps {
  tourId: string;
  orgSlug: string;
  maxDisplay?: number;
  isExpanded: boolean;
}

function formatDateTime(date: Date | string): { date: string; time: string } {
  const d = typeof date === "string" ? new Date(date) : date;
  return {
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(d),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(d),
  };
}

export function TourSchedulePreview({
  tourId,
  orgSlug,
  maxDisplay = 5,
  isExpanded,
}: TourSchedulePreviewProps) {
  const { data, isLoading, error } = trpc.schedule.list.useQuery(
    {
      filters: {
        tourId,
        dateRange: { from: new Date() },
        status: "scheduled",
      },
      pagination: { page: 1, limit: maxDisplay + 1 }, // +1 to check if there are more
      sort: { field: "startsAt", direction: "asc" },
    },
    { enabled: isExpanded }
  );

  if (!isExpanded) return null;

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load schedules
      </div>
    );
  }

  const schedules = data?.data || [];
  const hasMore = schedules.length > maxDisplay;
  const displaySchedules = schedules.slice(0, maxDisplay);

  if (displaySchedules.length === 0) {
    return (
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            No upcoming schedules for this tour
          </p>
          <Link
            href={`/org/${orgSlug}/tours/${tourId}` as Route}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Settings className="h-4 w-4" />
            Manage Schedules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-muted/30">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Upcoming Schedules
        </span>
        <Link
          href={`/org/${orgSlug}/tours/${tourId}` as Route}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Settings className="h-3.5 w-3.5" />
          Manage Schedules
        </Link>
      </div>

      {/* Schedule list */}
      <div className="divide-y divide-border/50">
        {displaySchedules.map((schedule) => {
          const { date, time } = formatDateTime(schedule.startsAt);
          const booked = schedule.bookedCount ?? 0;
          const max = schedule.maxParticipants;
          const percentage = max > 0 ? Math.round((booked / max) * 100) : 0;
          const remaining = max - booked;

          return (
            <div
              key={schedule.id}
              className="px-4 py-3 flex items-center gap-4 hover:bg-muted/50 transition-colors"
            >
              {/* Date/Time */}
              <div className="w-36 flex-shrink-0">
                <div className="text-sm font-medium text-foreground">{date}</div>
                <div className="text-xs text-muted-foreground">{time}</div>
              </div>

              {/* Capacity */}
              <div className="flex items-center gap-3 flex-1">
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      percentage >= 100
                        ? "bg-destructive"
                        : percentage >= 80
                        ? "bg-warning"
                        : "bg-success"
                    )}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
                <span className="text-sm">
                  <span
                    className={cn(
                      "font-medium",
                      percentage >= 100
                        ? "text-destructive"
                        : remaining <= 3
                        ? "text-warning"
                        : "text-success"
                    )}
                  >
                    {remaining > 0 ? `${remaining} left` : "FULL"}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    ({booked}/{max})
                  </span>
                </span>
              </div>

              {/* Guide */}
              <div className="w-32 flex-shrink-0">
                {schedule.guide ? (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">
                      {schedule.guide.firstName} {schedule.guide.lastName?.[0]}.
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-warning flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Needs guide
                  </span>
                )}
              </div>

              {/* Action */}
              <Link
                href={`/org/${orgSlug}/availability/${schedule.id}` as Route}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Footer with "View All" if there are more */}
      {hasMore && (
        <div className="px-4 py-2 border-t border-border/50 bg-muted/20">
          <Link
            href={`/org/${orgSlug}/availability?tourId=${tourId}` as Route}
            className="text-sm text-primary hover:underline"
          >
            View all {data?.total || schedules.length} schedules →
          </Link>
        </div>
      )}
    </div>
  );
}
