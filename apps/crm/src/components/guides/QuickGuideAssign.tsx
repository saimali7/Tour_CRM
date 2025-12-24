"use client";

import {
  User,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickGuideAssignProps {
  scheduleId: string;
  guidesRequired?: number;
  guidesAssigned?: number;
  compact?: boolean;
  className?: string;
}

/**
 * QuickGuideAssign - Shows guide staffing status for a schedule
 *
 * Note: Guide assignment is now done at the booking level, not schedule level.
 * This component just displays the aggregate staffing status.
 */
export function QuickGuideAssign({
  guidesRequired = 0,
  guidesAssigned = 0,
  compact = false,
  className,
}: QuickGuideAssignProps) {
  const needsGuides = guidesAssigned < guidesRequired;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <User className={cn(
          "h-3.5 w-3.5",
          needsGuides ? "text-warning" : "text-muted-foreground"
        )} />
        <span className={cn(
          "text-sm",
          needsGuides ? "text-warning font-medium" : "text-muted-foreground"
        )}>
          {guidesAssigned}/{guidesRequired}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md",
        needsGuides ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
      )}>
        {needsGuides ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <User className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {guidesAssigned}/{guidesRequired} guides
        </span>
      </div>
      {needsGuides && guidesRequired > 0 && (
        <span className="text-xs text-muted-foreground">
          Assign via bookings
        </span>
      )}
    </div>
  );
}
