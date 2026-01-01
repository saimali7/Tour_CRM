"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Check, CheckCircle2, Bell, Circle } from "lucide-react";

export type AssignmentStatusType = "needs_attention" | "ready" | "approved" | "notified" | "empty";

interface AssignmentStatusProps {
  status: AssignmentStatusType;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  AssignmentStatusType,
  {
    icon: React.ReactNode;
    label: string;
    className: string;
    iconClassName: string;
  }
> = {
  needs_attention: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: "Needs Attention",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    iconClassName: "text-amber-500",
  },
  ready: {
    icon: <Check className="h-3.5 w-3.5" />,
    label: "Ready",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    iconClassName: "text-emerald-500",
  },
  approved: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Approved",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    iconClassName: "text-blue-500",
  },
  notified: {
    icon: <Bell className="h-3.5 w-3.5" />,
    label: "Notified",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30",
    iconClassName: "text-violet-500",
  },
  empty: {
    icon: <Circle className="h-3.5 w-3.5" />,
    label: "No Bookings",
    className: "bg-muted text-muted-foreground border-border",
    iconClassName: "text-muted-foreground",
  },
};

export function AssignmentStatus({
  status,
  size = "sm",
  showLabel = true,
  className,
}: AssignmentStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        config.className,
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        className
      )}
    >
      <span className={config.iconClassName}>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// Icon-only version for compact displays
export function AssignmentStatusIcon({
  status,
  className,
}: {
  status: AssignmentStatusType;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <span className={cn(config.iconClassName, className)} title={config.label}>
      {config.icon}
    </span>
  );
}

// Determine status from assignment data
export function getAssignmentStatus(data: {
  totalBookings: number;
  assignedBookings: number;
  isApproved?: boolean;
  isNotified?: boolean;
}): AssignmentStatusType {
  if (data.totalBookings === 0) return "empty";
  if (data.isNotified) return "notified";
  if (data.isApproved) return "approved";
  if (data.assignedBookings >= data.totalBookings) return "ready";
  return "needs_attention";
}
