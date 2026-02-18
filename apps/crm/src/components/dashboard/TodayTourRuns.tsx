"use client";

import { useState } from "react";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  UserPlus,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { QuickGuideAssignSheet } from "@/components/scheduling/quick-guide-assign-sheet";
import { formatLocalDateKey } from "@/lib/date-time";

interface TodayTourRunsProps {
  orgSlug: string;
}

function toDateKey(value: Date | string | null | undefined): string {
  if (!value) return formatLocalDateKey(new Date());
  if (typeof value === "string") {
    const explicitMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (explicitMatch?.[1]) return explicitMatch[1];
    return formatLocalDateKey(new Date(value));
  }
  return formatLocalDateKey(value);
}

export function TodayTourRuns({ orgSlug }: TodayTourRunsProps) {
  const [assignState, setAssignState] = useState<{
    isOpen: boolean;
    tourRun: {
      tourId: string;
      tourName: string;
      date: Date | string;
      time: string;
      bookingId?: string;
    };
  } | null>(null);

  const { data, isLoading } = trpc.tourRun.getToday.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tourRuns = data?.tourRuns ?? [];

  if (tourRuns.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground">
          No tours running today
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Tour runs will appear here when bookings are made.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {tourRuns.map((run) => {
          const utilization =
            run.capacity > 0
              ? (run.totalParticipants / run.capacity) * 100
              : 0;
          const runDateKey = toDateKey(run.date as Date | string | undefined);
          const isFull = utilization >= 100;
          const isLow = utilization < 30;
          const needsGuides = run.guidesAssigned < run.guidesRequired;

          // Create a unique key for this tour run
          const runKey = `${run.tourId}-${run.time}`;

          return (
            <div
              key={runKey}
              className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-border/80 transition-colors"
            >
              {/* Time */}
              <div className="w-20 flex-shrink-0">
                <span className="text-lg font-semibold text-foreground font-mono">
                  {run.time}
                </span>
              </div>

              {/* Tour Info + Capacity */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/org/${orgSlug}/tours/${run.tourId}`}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {run.tourName}
                </Link>

                {/* Capacity Bar */}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isFull
                          ? "bg-success"
                          : utilization >= 70
                            ? "bg-success/80"
                            : utilization >= 40
                              ? "bg-warning"
                              : "bg-destructive"
                      )}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium whitespace-nowrap",
                      isFull
                        ? "text-success"
                        : isLow
                          ? "text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {run.totalParticipants}/{run.capacity} guests
                    {isFull && " FULL"}
                  </span>
                </div>
              </div>

              {/* Guide Status */}
              <div className="w-44 flex-shrink-0">
                {run.guidesAssigned >= run.guidesRequired ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    <span className="text-sm text-foreground">
                      {run.guidesAssigned} guide
                      {run.guidesAssigned !== 1 ? "s" : ""} assigned
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      // Get the first booking from the run for guide assignment
                      const firstBooking = run.bookings?.[0];
                      setAssignState({
                        isOpen: true,
                        tourRun: {
                          tourId: run.tourId,
                          tourName: run.tourName,
                          date: run.date,
                          time: run.time,
                          bookingId: firstBooking?.id,
                        },
                      });
                    }}
                    className="flex items-center gap-2 text-destructive hover:text-destructive/90 group"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium group-hover:underline">
                      Need {run.guidesRequired - run.guidesAssigned} more guide
                      {run.guidesRequired - run.guidesAssigned !== 1 ? "s" : ""}
                    </span>
                  </button>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  href={`/org/${orgSlug}/tour-run?tourId=${run.tourId}&date=${runDateKey}&time=${run.time}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="View Manifest"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Manifest</span>
                </Link>
                <Link
                  href={`/org/${orgSlug}/tours/${run.tourId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  title="View Tour"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">Tour</span>
                </Link>
                {needsGuides && (
                  <button
                    onClick={() => {
                      const firstBooking = run.bookings?.[0];
                      setAssignState({
                        isOpen: true,
                        tourRun: {
                          tourId: run.tourId,
                          tourName: run.tourName,
                          date: run.date,
                          time: run.time,
                          bookingId: firstBooking?.id,
                        },
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

      {/* Quick Assign Guide Sheet */}
      {assignState && assignState.tourRun.bookingId && (
        <QuickGuideAssignSheet
          open={assignState.isOpen}
          onOpenChange={(open) => !open && setAssignState(null)}
          bookingId={assignState.tourRun.bookingId}
          scheduleInfo={{
            id: `${assignState.tourRun.tourId}-${assignState.tourRun.time}`,
            tourName: assignState.tourRun.tourName,
            date: toDateKey(assignState.tourRun.date),
            time: assignState.tourRun.time,
          }}
          onSuccess={() => setAssignState(null)}
        />
      )}
    </>
  );
}
