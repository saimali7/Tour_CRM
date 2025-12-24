"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Flag,
  Eye,
  Edit,
  Plus,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScheduleStatusBadge } from "@/components/ui/status-badge";
import {
  ContextPanelSection,
  ContextPanelRow,
  ContextPanelSkeleton,
  ContextPanelEmpty,
} from "@/components/layout/context-panel";
import { cn } from "@/lib/utils";

interface SchedulePreviewProps {
  scheduleId: string;
}

export function SchedulePreview({ scheduleId }: SchedulePreviewProps) {
  const params = useParams();
  const slug = params.slug as string;

  const { data: schedule, isLoading, error } = trpc.schedule.getById.useQuery(
    { id: scheduleId },
    { enabled: !!scheduleId }
  );

  if (isLoading) {
    return <ContextPanelSkeleton />;
  }

  if (error || !schedule) {
    return (
      <ContextPanelEmpty
        icon={<AlertCircle className="h-5 w-5 text-muted-foreground" />}
        title="Schedule not found"
        description="This schedule may have been deleted"
      />
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  const formatTimeRange = (start: Date, end?: Date | null) => {
    const startTime = formatTime(start);
    if (!end) return startTime;
    const endTime = formatTime(end);
    return `${startTime} - ${endTime}`;
  };

  const currentParticipants = schedule.bookedCount || 0;
  const maxParticipants = schedule.maxParticipants || 0;
  const availableSpots = maxParticipants - currentParticipants;
  const capacityPercent = maxParticipants > 0 ? (currentParticipants / maxParticipants) * 100 : 0;
  const price = parseFloat(schedule.price || "0");

  return (
    <>
      {/* Status & Date Header */}
      <ContextPanelSection>
        <div className="flex items-center gap-2 mb-3">
          <ScheduleStatusBadge status={schedule.status as "scheduled" | "in_progress" | "completed" | "cancelled"} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground">
              {formatDate(schedule.startsAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{formatTimeRange(schedule.startsAt, schedule.endsAt)}</span>
          </div>
        </div>
      </ContextPanelSection>

      {/* Tour Information */}
      {schedule.tour && (
        <ContextPanelSection title="Tour">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{schedule.tour.name}</p>
            {schedule.tour.durationMinutes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{schedule.tour.durationMinutes} minutes</span>
              </div>
            )}
            <Link
              href={`/org/${slug}/tours/${schedule.tourId}` as Route}
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
            >
              View tour details
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </ContextPanelSection>
      )}

      {/* Capacity Section */}
      <ContextPanelSection title="Capacity">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-semibold tabular-nums">{currentParticipants}</span>
              <span className="text-sm text-muted-foreground">/ {maxParticipants}</span>
            </div>
            <span className={cn(
              "text-sm font-medium",
              availableSpots > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            )}>
              {availableSpots > 0 ? `${availableSpots} spots left` : "Full"}
            </span>
          </div>

          {/* Capacity Bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                capacityPercent >= 90 ? "bg-amber-500" :
                capacityPercent >= 70 ? "bg-emerald-500" :
                "bg-primary"
              )}
              style={{ width: `${Math.min(capacityPercent, 100)}%` }}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            {capacityPercent.toFixed(0)}% capacity filled
          </div>
        </div>
      </ContextPanelSection>

      {/* Guide Staffing Section */}
      <ContextPanelSection title="Guide Staffing">
        {(() => {
          const needsGuides = schedule.guidesAssigned < schedule.guidesRequired;
          const guideStatus = needsGuides
            ? `Needs ${schedule.guidesRequired - schedule.guidesAssigned} more guide(s)`
            : 'Fully staffed';

          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {schedule.guidesAssigned} / {schedule.guidesRequired} guides
                  </span>
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  needsGuides ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {guideStatus}
                </span>
              </div>
              {needsGuides && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  <span>Additional guides needed</span>
                </div>
              )}
            </div>
          );
        })()}
      </ContextPanelSection>

      {/* Meeting Point */}
      {schedule.meetingPoint && (
        <ContextPanelSection title="Meeting Point">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground">
                {schedule.meetingPoint}
              </p>
              {schedule.meetingPointDetails && (
                <p className="text-xs text-muted-foreground mt-1">
                  {schedule.meetingPointDetails}
                </p>
              )}
            </div>
          </div>
        </ContextPanelSection>
      )}

      {/* Price */}
      {price > 0 && (
        <ContextPanelSection title="Pricing">
          <ContextPanelRow
            label="Price per person"
            value={
              <span className="font-semibold tabular-nums">
                ${price.toFixed(2)} {schedule.currency || "USD"}
              </span>
            }
          />
        </ContextPanelSection>
      )}

      {/* Notes */}
      {schedule.publicNotes && (
        <ContextPanelSection title="Public Notes">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {schedule.publicNotes}
          </p>
        </ContextPanelSection>
      )}

      {schedule.internalNotes && (
        <ContextPanelSection title="Internal Notes">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {schedule.internalNotes}
          </p>
        </ContextPanelSection>
      )}
    </>
  );
}

// Footer actions for the schedule preview
export function SchedulePreviewActions({ scheduleId }: { scheduleId: string }) {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" asChild>
        <Link href={`/org/${slug}/calendar?schedule=${scheduleId}` as Route}>
          <Eye className="h-4 w-4 mr-1.5" />
          View
        </Link>
      </Button>
      <Button variant="default" size="sm" className="flex-1" asChild>
        <Link href={`/org/${slug}/bookings?schedule=${scheduleId}&quick=1` as Route}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Booking
        </Link>
      </Button>
    </div>
  );
}
