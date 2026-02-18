"use client";

import { useState } from "react";
import { Users, CheckCircle2, AlertCircle, Eye, FileText, UserPlus } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { QuickAssignGuideModal } from "./QuickAssignGuideModal";
import { formatLocalDateKey } from "@/lib/date-time";

interface TodayScheduleItem {
  scheduleId: string;
  time: string;
  tourName: string;
  tourId: string;
  bookedParticipants: number;
  capacity: number;
  guide: {
    id: string;
    name: string;
    confirmed?: boolean;
  } | null;
  status: "on_track" | "needs_attention" | "issue";
  statusReason?: string;
  startsAt?: Date;
  endsAt?: Date;
}

interface TodayScheduleProps {
  schedule: TodayScheduleItem[];
  orgSlug: string;
}

export function TodaySchedule({ schedule, orgSlug }: TodayScheduleProps) {
  const [assignModalState, setAssignModalState] = useState<{
    isOpen: boolean;
    scheduleId: string;
    tourName: string;
    startsAt: Date;
    endsAt: Date;
  } | null>(null);

  if (schedule.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground">No tours scheduled for today</p>
        <p className="text-sm text-muted-foreground mt-1">Your schedule will appear here when tours are planned.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {schedule.map((item) => {
          const utilization = item.capacity > 0 ? (item.bookedParticipants / item.capacity) * 100 : 0;
          const isFull = utilization >= 100;
          const isLow = utilization < 30;
          const isoDate = item.startsAt ? formatLocalDateKey(new Date(item.startsAt)) : "";
          const dateParam = isoDate
            ? `?date=${isoDate}`
            : "";
          const commandCenterHref = `/org/${orgSlug}/command-center${dateParam}` as Route;

          return (
            <div
              key={item.scheduleId}
              className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-border/80 transition-colors"
            >
              {/* Time */}
              <div className="w-20 flex-shrink-0">
                <span className="text-lg font-semibold text-foreground">{item.time}</span>
              </div>

              {/* Tour Info + Capacity */}
              <div className="flex-1 min-w-0">
                <Link
                  href={commandCenterHref}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {item.tourName}
                </Link>

                {/* Capacity Bar - Larger and more visual */}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFull
                          ? "bg-success"
                          : utilization >= 70
                          ? "bg-success/80"
                          : utilization >= 40
                          ? "bg-warning"
                          : "bg-destructive"
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium whitespace-nowrap ${
                    isFull
                      ? "text-success"
                      : isLow
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}>
                    {item.bookedParticipants}/{item.capacity} guests
                    {isFull && " FULL"}
                  </span>
                </div>
              </div>

              {/* Guide Status */}
              <div className="w-40 flex-shrink-0">
                {item.guide ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    <span className="text-sm text-foreground truncate">{item.guide.name}</span>
                  </div>
                ) : item.startsAt && item.endsAt ? (
                  <button
                    onClick={() => {
                      setAssignModalState({
                        isOpen: true,
                        scheduleId: item.scheduleId,
                        tourName: item.tourName,
                        startsAt: item.startsAt!,
                        endsAt: item.endsAt!,
                      });
                    }}
                    className="flex items-center gap-2 text-destructive hover:text-destructive/90 group"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium group-hover:underline">No guide</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">No guide</span>
                  </span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  href={commandCenterHref}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="View Manifest"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Manifest</span>
                </Link>
                <Link
                  href={commandCenterHref}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">Details</span>
                </Link>
                {!item.guide && item.startsAt && item.endsAt && (
                  <button
                    onClick={() => {
                      setAssignModalState({
                        isOpen: true,
                        scheduleId: item.scheduleId,
                        tourName: item.tourName,
                        startsAt: item.startsAt!,
                        endsAt: item.endsAt!,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                    title="Assign Guide"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Assign</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Assign Guide Modal */}
      {assignModalState && (
        <QuickAssignGuideModal
          isOpen={assignModalState.isOpen}
          onClose={() => setAssignModalState(null)}
          scheduleId={assignModalState.scheduleId}
          tourName={assignModalState.tourName}
          startsAt={assignModalState.startsAt}
          endsAt={assignModalState.endsAt}
        />
      )}
    </>
  );
}
