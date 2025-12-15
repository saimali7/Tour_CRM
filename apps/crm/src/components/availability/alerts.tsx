"use client";

import { AlertTriangle, TrendingUp, UserX, X } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

interface Schedule {
  id: string;
  startsAt: Date;
  maxParticipants: number;
  bookedCount: number | null;
  status: string;
  tour?: {
    id: string;
    name: string;
  } | null;
  guide?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface AvailabilityAlertsProps {
  schedules: Schedule[];
  orgSlug: string;
  dateLabel: string;
}

function generateAlerts(schedules: Schedule[], orgSlug: string): Alert[] {
  const alerts: Alert[] = [];

  // Filter to only scheduled tours (not completed/cancelled)
  const activeSchedules = schedules.filter((s) => s.status === "scheduled");

  // Find tours without guides
  const noGuideSchedules = activeSchedules.filter((s) => !s.guide);
  if (noGuideSchedules.length > 0) {
    alerts.push({
      id: "no-guides",
      type: "critical",
      title: `${noGuideSchedules.length} tour${noGuideSchedules.length > 1 ? "s" : ""} without guides`,
      description: noGuideSchedules
        .slice(0, 3)
        .map((s) => s.tour?.name || "Unknown")
        .join(", ") + (noGuideSchedules.length > 3 ? ` and ${noGuideSchedules.length - 3} more` : ""),
      action: {
        label: "Assign Guides",
        href: `/org/${orgSlug}/availability?filter=no-guide`,
      },
    });
  }

  // Find tours that are almost full (90%+)
  const almostFullSchedules = activeSchedules.filter((s) => {
    const booked = s.bookedCount ?? 0;
    const percentage = s.maxParticipants > 0 ? (booked / s.maxParticipants) * 100 : 0;
    return percentage >= 90 && percentage < 100;
  });
  if (almostFullSchedules.length > 0) {
    alerts.push({
      id: "almost-full",
      type: "warning",
      title: `${almostFullSchedules.length} tour${almostFullSchedules.length > 1 ? "s" : ""} almost full`,
      description: "Consider adding additional time slots to capture demand",
      action: {
        label: "View Tours",
        href: `/org/${orgSlug}/availability?filter=almost-full`,
      },
    });
  }

  // Find tours that are completely full
  const fullSchedules = activeSchedules.filter((s) => {
    const booked = s.bookedCount ?? 0;
    return s.maxParticipants > 0 && booked >= s.maxParticipants;
  });
  if (fullSchedules.length > 0) {
    alerts.push({
      id: "sold-out",
      type: "info",
      title: `${fullSchedules.length} tour${fullSchedules.length > 1 ? "s" : ""} sold out`,
      description: fullSchedules
        .slice(0, 3)
        .map((s) => s.tour?.name || "Unknown")
        .join(", "),
      action: {
        label: "Add Time Slot",
        href: `/org/${orgSlug}/availability/new`,
      },
    });
  }

  // Find low capacity tours (less than 30% booked)
  const lowCapacitySchedules = activeSchedules.filter((s) => {
    const booked = s.bookedCount ?? 0;
    const percentage = s.maxParticipants > 0 ? (booked / s.maxParticipants) * 100 : 0;
    return percentage < 30 && percentage > 0;
  });
  if (lowCapacitySchedules.length >= 3) {
    alerts.push({
      id: "low-capacity",
      type: "info",
      title: `${lowCapacitySchedules.length} tours under 30% capacity`,
      description: "Consider promotions or consolidating schedules",
      action: {
        label: "Create Promo",
        href: `/org/${orgSlug}/promo-codes`,
      },
    });
  }

  return alerts;
}

export function AvailabilityAlerts({ schedules, orgSlug, dateLabel }: AvailabilityAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const alerts = generateAlerts(schedules, orgSlug);
  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.has(a.id));

  if (visibleAlerts.length === 0) return null;

  const dismissAlert = (id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]));
  };

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3",
            alert.type === "critical" && "border-destructive/30 bg-destructive/5",
            alert.type === "warning" && "border-warning/30 bg-warning/5",
            alert.type === "info" && "border-primary/30 bg-primary/5"
          )}
        >
          <div
            className={cn(
              "mt-0.5",
              alert.type === "critical" && "text-destructive",
              alert.type === "warning" && "text-warning",
              alert.type === "info" && "text-primary"
            )}
          >
            {alert.type === "critical" && <UserX className="h-5 w-5" />}
            {alert.type === "warning" && <TrendingUp className="h-5 w-5" />}
            {alert.type === "info" && <AlertTriangle className="h-5 w-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium",
                alert.type === "critical" && "text-destructive",
                alert.type === "warning" && "text-warning",
                alert.type === "info" && "text-primary"
              )}
            >
              {alert.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
          </div>

          {alert.action && (
            <Link
              href={alert.action.href as Route}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
                alert.type === "critical" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                alert.type === "warning" &&
                  "bg-warning text-warning-foreground hover:bg-warning/90",
                alert.type === "info" &&
                  "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {alert.action.label}
            </Link>
          )}

          <button
            onClick={() => dismissAlert(alert.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
