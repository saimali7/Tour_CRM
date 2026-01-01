"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { Route } from "next";
import { format } from "date-fns";
import { Users, UserCheck, ChevronRight, Lock } from "lucide-react";
import { CapacityBar } from "./capacity-bar";
import { AssignmentStatusIcon, getAssignmentStatus, type AssignmentStatusType } from "./assignment-status";

interface TourCardProps {
  scheduleId: string;
  tourName: string;
  startsAt: Date | string;
  guestCount: number;
  bookingCount: number;
  assignedCount: number;
  guidesAssigned: number;
  guidesNeeded: number;
  status: AssignmentStatusType;
  orgSlug: string;
  className?: string;
}

export function TourCard({
  scheduleId,
  tourName,
  startsAt,
  guestCount,
  bookingCount,
  assignedCount,
  guidesAssigned,
  guidesNeeded,
  status,
  orgSlug,
  className,
}: TourCardProps) {
  const time = format(new Date(startsAt), "h:mm a");
  const assignmentProgress = bookingCount > 0 ? (assignedCount / bookingCount) * 100 : 100;
  const needsAttention = status === "needs_attention";
  const isApproved = status === "approved" || status === "notified";

  return (
    <Link
      href={`/org/${orgSlug}/operations/${scheduleId}` as Route}
      className={cn(
        "group flex items-center gap-4 px-4 py-3 rounded-lg border transition-all duration-150",
        "hover:bg-muted/50 hover:border-muted-foreground/20",
        needsAttention && "border-amber-500/30 bg-amber-500/5",
        isApproved && "border-blue-500/20 bg-blue-500/5",
        !needsAttention && !isApproved && "border-border bg-card",
        className
      )}
    >
      {/* Time */}
      <div className="w-20 flex-shrink-0">
        <span className="text-lg font-semibold font-mono tabular-nums text-foreground">
          {time}
        </span>
      </div>

      {/* Tour Name + Assignment Progress */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{tourName}</span>
          {isApproved && (
            <Lock className="h-3 w-3 text-blue-500 flex-shrink-0" />
          )}
        </div>

        {/* Progress bar for assignment completion */}
        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-[200px]">
            <CapacityBar
              current={assignedCount}
              max={bookingCount}
              size="sm"
              showLabel={false}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {assignedCount}/{bookingCount} assigned
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 text-sm">
        {/* Guests */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="font-mono tabular-nums">{guestCount}</span>
        </div>

        {/* Guides */}
        <div
          className={cn(
            "flex items-center gap-1.5",
            guidesAssigned < guidesNeeded
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
          )}
        >
          <UserCheck className="h-4 w-4" />
          <span className="font-mono tabular-nums">
            {guidesAssigned}/{guidesNeeded}
          </span>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <AssignmentStatusIcon status={status} className="h-4 w-4" />
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

// Compact version for mobile
export function TourCardCompact({
  scheduleId,
  tourName,
  startsAt,
  guestCount,
  status,
  orgSlug,
  className,
}: Pick<
  TourCardProps,
  "scheduleId" | "tourName" | "startsAt" | "guestCount" | "status" | "orgSlug" | "className"
>) {
  const time = format(new Date(startsAt), "h:mm a");

  return (
    <Link
      href={`/org/${orgSlug}/operations/${scheduleId}` as Route}
      className={cn(
        "flex items-center justify-between px-3 py-2.5 rounded-lg border border-border",
        "hover:bg-muted/50 transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <AssignmentStatusIcon status={status} />
        <div>
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {time}
          </span>
          <span className="mx-2 text-muted-foreground/50">·</span>
          <span className="text-sm font-medium text-foreground">{tourName}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span>{guestCount}</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
