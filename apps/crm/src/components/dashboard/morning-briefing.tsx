"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Printer,
  Sun,
  Users,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  UserPlus,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Route } from "next";

interface MorningBriefingProps {
  orgSlug: string;
}

export function MorningBriefing({ orgSlug }: MorningBriefingProps) {
  const [expanded, setExpanded] = useState(true);

  // Fetch today's schedules with assignments
  const { data: todaySchedules, isLoading: schedulesLoading } = trpc.schedule.getTodaysSchedules.useQuery();

  // Calculate metrics from today's schedules
  const todayStats = (() => {
    if (!todaySchedules) return null;

    let totalParticipants = 0;
    let expectedRevenue = 0;
    let unassignedGuides = 0;
    let pendingConfirmations = 0;
    let lowCapacity = 0;
    let highCapacity = 0;

    todaySchedules.forEach((schedule) => {
      totalParticipants += schedule.bookedCount ?? 0;
      // Estimate revenue: participants * average price (use schedule price or tour base price)
      const price = parseFloat(schedule.price || schedule.tour?.basePrice || "0");
      expectedRevenue += (schedule.bookedCount ?? 0) * price;

      // Check guide assignment
      if (!schedule.assignments || schedule.assignments.length === 0) {
        unassignedGuides++;
      } else {
        const pendingAssignments = schedule.assignments.filter(
          (a) => a.status === "pending"
        );
        if (pendingAssignments.length > 0) {
          pendingConfirmations++;
        }
      }

      // Check capacity
      const utilization = schedule.maxParticipants > 0
        ? ((schedule.bookedCount ?? 0) / schedule.maxParticipants) * 100
        : 0;
      if (utilization < 30 && (schedule.bookedCount ?? 0) > 0) {
        lowCapacity++;
      }
      if (utilization >= 90) {
        highCapacity++;
      }
    });

    return {
      totalTours: todaySchedules.length,
      totalParticipants,
      expectedRevenue,
      unassignedGuides,
      pendingConfirmations,
      lowCapacity,
      highCapacity,
    };
  })();

  // Generate alerts
  const alerts = (() => {
    if (!todaySchedules || !todayStats) return [];

    const alertList: Array<{
      type: "error" | "warning" | "info";
      message: string;
      scheduleId?: string;
      tourName?: string;
    }> = [];

    todaySchedules.forEach((schedule) => {
      // Unassigned guide
      if (!schedule.assignments || schedule.assignments.length === 0) {
        alertList.push({
          type: "error",
          message: `${format(new Date(schedule.startsAt), "h:mm a")} ${schedule.tour?.name || "Tour"} has no guide assigned`,
          scheduleId: schedule.id,
          tourName: schedule.tour?.name,
        });
      }

      // Pending confirmation
      const pendingAssignments = schedule.assignments?.filter(
        (a) => a.status === "pending"
      );
      if (pendingAssignments && pendingAssignments.length > 0) {
        alertList.push({
          type: "warning",
          message: `${format(new Date(schedule.startsAt), "h:mm a")} ${schedule.tour?.name || "Tour"} has pending guide confirmation`,
          scheduleId: schedule.id,
          tourName: schedule.tour?.name,
        });
      }

      // Low capacity warning
      const utilization = schedule.maxParticipants > 0
        ? ((schedule.bookedCount ?? 0) / schedule.maxParticipants) * 100
        : 0;
      if (utilization < 30 && (schedule.bookedCount ?? 0) > 0) {
        alertList.push({
          type: "info",
          message: `${format(new Date(schedule.startsAt), "h:mm a")} ${schedule.tour?.name || "Tour"} is only ${Math.round(utilization)}% full`,
          scheduleId: schedule.id,
          tourName: schedule.tour?.name,
        });
      }

      // High capacity celebration
      if (utilization >= 95) {
        alertList.push({
          type: "info",
          message: `${format(new Date(schedule.startsAt), "h:mm a")} ${schedule.tour?.name || "Tour"} is nearly sold out!`,
          scheduleId: schedule.id,
          tourName: schedule.tour?.name,
        });
      }
    });

    return alertList;
  })();

  const criticalAlerts = alerts.filter((a) => a.type === "error");
  const warningAlerts = alerts.filter((a) => a.type === "warning");

  // Print all manifests
  const handlePrintAllManifests = () => {
    // Open print dialog with all manifests
    if (todaySchedules && todaySchedules.length > 0) {
      window.open(`/org/${orgSlug}/schedules/print-manifests?date=${format(new Date(), "yyyy-MM-dd")}`, "_blank");
    }
  };

  // Email briefing
  const handleEmailBriefing = () => {
    // Generate briefing content
    const briefingContent = `
Morning Briefing - ${format(new Date(), "EEEE, MMMM d, yyyy")}

SUMMARY
- ${todayStats?.totalTours || 0} tours scheduled
- ${todayStats?.totalParticipants || 0} total guests
- Expected revenue: $${todayStats?.expectedRevenue?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}

${criticalAlerts.length > 0 ? `CRITICAL ISSUES (${criticalAlerts.length})
${criticalAlerts.map((a) => `- ${a.message}`).join("\n")}
` : ""}
${warningAlerts.length > 0 ? `WARNINGS (${warningAlerts.length})
${warningAlerts.map((a) => `- ${a.message}`).join("\n")}
` : ""}
TODAY'S SCHEDULE
${todaySchedules?.map((s) => `- ${format(new Date(s.startsAt), "h:mm a")} - ${s.tour?.name || "Tour"} (${s.bookedCount ?? 0} pax)`).join("\n") || "No schedules"}
    `.trim();

    // Copy to clipboard as a quick action
    navigator.clipboard.writeText(briefingContent);
    toast.success("Briefing copied to clipboard! Paste into your email client.");
  };

  if (schedulesLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Don't show if no schedules today
  if (!todaySchedules || todaySchedules.length === 0) {
    return (
      <div className="bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-xl border border-blue-500/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Sun className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Good {getTimeOfDay()}!
            </h2>
            <p className="text-sm text-muted-foreground">
              No tours scheduled for today. Time to focus on other things!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-xl border border-blue-500/10 overflow-hidden">
      {/* Header */}
      <div
        className="p-6 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Sun className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Morning Briefing
            </h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")} • {todayStats?.totalTours} tours, {todayStats?.totalParticipants} guests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {criticalAlerts.length > 0 && (
            <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
              <AlertTriangle className="h-4 w-4" />
              {criticalAlerts.length} critical
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alerts ({alerts.length})
              </h3>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      alert.type === "error" && "bg-red-500/5 border-red-500/20",
                      alert.type === "warning" && "bg-orange-500/5 border-orange-500/20",
                      alert.type === "info" && "bg-blue-500/5 border-blue-500/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {alert.type === "error" && <X className="h-4 w-4 text-red-600" />}
                      {alert.type === "warning" && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                      {alert.type === "info" && <Check className="h-4 w-4 text-blue-600" />}
                      <span className="text-sm text-foreground">{alert.message}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Quick action button for critical issues */}
                      {alert.type === "error" && alert.scheduleId && (
                        <Link
                          href={`/org/${orgSlug}/schedules/${alert.scheduleId}?action=assign` as Route}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-500/10 rounded hover:bg-red-500/20 transition-colors"
                        >
                          <UserPlus className="h-3 w-3" />
                          Assign
                        </Link>
                      )}
                      {alert.type === "warning" && alert.scheduleId && (
                        <Link
                          href={`/org/${orgSlug}/schedules/${alert.scheduleId}?action=remind` as Route}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-600 bg-orange-500/10 rounded hover:bg-orange-500/20 transition-colors"
                        >
                          <Send className="h-3 w-3" />
                          Remind
                        </Link>
                      )}
                      {alert.scheduleId && (
                        <Link
                          href={`/org/${orgSlug}/schedules/${alert.scheduleId}` as Route}
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {alerts.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{alerts.length - 5} more alerts
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Today's Schedule */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today's Schedule
            </h3>
            <div className="grid gap-2">
              {todaySchedules.map((schedule) => {
                const hasGuide = schedule.assignments && schedule.assignments.length > 0;
                const guideConfirmed = schedule.assignments?.some((a) => a.status === "confirmed");
                return (
                  <Link
                    key={schedule.id}
                    href={`/org/${orgSlug}/schedules/${schedule.id}` as Route}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-semibold text-foreground">
                          {format(new Date(schedule.startsAt), "h:mm")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(schedule.startsAt), "a")}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {schedule.tour?.name || "Tour"}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {schedule.bookedCount ?? 0}/{schedule.maxParticipants} pax
                          </span>
                          {hasGuide ? (
                            <span className={cn(
                              "flex items-center gap-1",
                              guideConfirmed ? "text-emerald-600" : "text-orange-600"
                            )}>
                              {guideConfirmed ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {schedule.assignments?.[0]?.guide?.firstName || "Guide"} {guideConfirmed ? "✓" : "(pending)"}
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              No guide
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        ${((schedule.bookedCount ?? 0) * parseFloat(schedule.price || schedule.tour?.basePrice || "0")).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">expected</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Summary and Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Expected Revenue</p>
                <p className="text-xl font-semibold text-emerald-600">
                  ${todayStats?.expectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Guests</p>
                <p className="text-xl font-semibold text-foreground">
                  {todayStats?.totalParticipants}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmailBriefing}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Copy Briefing
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintAllManifests}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Manifests
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
