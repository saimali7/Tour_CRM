"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Clock, Users, UserCircle, Eye, Plus, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Schedule {
  id: string;
  startsAt: Date;
  endsAt: Date;
  maxParticipants: number;
  bookedCount: number | null;
  price: string | null;
  status: string;
  tour?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  guide?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Guide {
  id: string;
  firstName: string;
  lastName: string;
}

interface DayViewProps {
  schedules: Schedule[];
  orgSlug: string;
  selectedDate: Date;
  onQuickBook?: (scheduleId: string) => void;
}

type TimeOfDay = "morning" | "afternoon" | "evening";

function getTimeOfDay(date: Date): TimeOfDay {
  const hours = new Date(date).getHours();
  if (hours < 12) return "morning";
  if (hours < 17) return "afternoon";
  return "evening";
}

function groupByTimeOfDay(schedules: Schedule[]): Record<TimeOfDay, Schedule[]> {
  const groups: Record<TimeOfDay, Schedule[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  schedules.forEach((schedule) => {
    const timeOfDay = getTimeOfDay(schedule.startsAt);
    groups[timeOfDay].push(schedule);
  });

  // Sort each group by start time
  Object.keys(groups).forEach((key) => {
    groups[key as TimeOfDay].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
  });

  return groups;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

function getCapacityStatus(booked: number, max: number): {
  label: string;
  color: "success" | "warning" | "destructive" | "muted";
  badge: string | null;
} {
  if (max === 0) return { label: "N/A", color: "muted", badge: null };

  const percentage = (booked / max) * 100;
  const remaining = max - booked;

  if (percentage >= 100) {
    return { label: "FULL", color: "destructive", badge: "Sold Out" };
  }
  if (percentage >= 90) {
    return { label: `${remaining} LEFT`, color: "destructive", badge: "Almost Full" };
  }
  if (percentage >= 70) {
    return { label: `${remaining} LEFT`, color: "warning", badge: "Filling Up" };
  }
  return { label: `${remaining} LEFT`, color: "success", badge: remaining >= 5 ? "Good Availability" : null };
}

function QuickGuideAssign({
  schedule,
  guides,
  onAssign,
  isAssigning,
}: {
  schedule: Schedule;
  guides: Guide[];
  onAssign: (scheduleId: string, guideId: string | null) => void;
  isAssigning: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasGuide = !!schedule.guide;
  const booked = schedule.bookedCount ?? 0;
  const needsGuide = booked > 0 && !hasGuide;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isAssigning}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors",
          hasGuide
            ? "text-success hover:bg-success/10"
            : needsGuide
            ? "text-warning bg-warning/10 hover:bg-warning/20 font-medium"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        <UserCircle className="h-3.5 w-3.5" />
        {hasGuide ? (
          <span>{schedule.guide?.firstName} {schedule.guide?.lastName}</span>
        ) : needsGuide ? (
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Assign Guide
          </span>
        ) : (
          <span>No guide</span>
        )}
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 w-48 py-1 bg-popover border border-border rounded-lg shadow-lg">
            {hasGuide && (
              <button
                onClick={() => {
                  onAssign(schedule.id, null);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                Remove guide
              </button>
            )}
            {hasGuide && guides.length > 0 && (
              <div className="border-t border-border my-1" />
            )}
            {guides.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No guides available
              </div>
            ) : (
              guides.map((guide) => (
                <button
                  key={guide.id}
                  onClick={() => {
                    onAssign(schedule.id, guide.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2",
                    schedule.guide?.id === guide.id && "bg-primary/10 text-primary"
                  )}
                >
                  <CheckCircle2 className={cn(
                    "h-3.5 w-3.5",
                    schedule.guide?.id === guide.id ? "opacity-100" : "opacity-0"
                  )} />
                  {guide.firstName} {guide.lastName}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ScheduleCard({
  schedule,
  orgSlug,
  guides,
  onQuickBook,
  onAssignGuide,
  isAssigning,
}: {
  schedule: Schedule;
  orgSlug: string;
  guides: Guide[];
  onQuickBook?: (scheduleId: string) => void;
  onAssignGuide: (scheduleId: string, guideId: string | null) => void;
  isAssigning: boolean;
}) {
  const booked = schedule.bookedCount ?? 0;
  const max = schedule.maxParticipants;
  const percentage = max > 0 ? Math.min(100, (booked / max) * 100) : 0;
  const capacityStatus = getCapacityStatus(booked, max);
  const isFull = percentage >= 100;
  const needsGuide = booked > 0 && !schedule.guide;

  return (
    <div className={cn(
      "rounded-lg border bg-card p-4 transition-all hover:shadow-md",
      needsGuide ? "border-warning/50 bg-warning/5" :
      isFull ? "border-destructive/30 bg-destructive/5" : "border-border"
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: Time and Tour Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg font-semibold text-foreground">
              {formatTime(schedule.startsAt)}
            </span>
            {capacityStatus.badge && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                capacityStatus.color === "destructive" && "bg-destructive/10 text-destructive",
                capacityStatus.color === "warning" && "bg-warning/10 text-warning",
                capacityStatus.color === "success" && "bg-success/10 text-success",
              )}>
                {capacityStatus.badge}
              </span>
            )}
          </div>

          <h3 className="text-base font-medium text-foreground truncate">
            {schedule.tour?.name || "Unknown Tour"}
          </h3>

          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(schedule.startsAt)} - {formatTime(schedule.endsAt)}
            </span>
            {schedule.price && (
              <span className="font-medium text-foreground">
                ${parseFloat(schedule.price).toFixed(0)}
              </span>
            )}
          </div>

          {/* Guide Assignment - prominent for booked schedules */}
          <div className="mt-2">
            <QuickGuideAssign
              schedule={schedule}
              guides={guides}
              onAssign={onAssignGuide}
              isAssigning={isAssigning}
            />
          </div>
        </div>

        {/* Right: Capacity and Actions */}
        <div className="flex flex-col items-end gap-3">
          {/* Capacity Display */}
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {booked} / {max}
              </span>
            </div>
            <span className={cn(
              "text-xs font-semibold",
              capacityStatus.color === "destructive" && "text-destructive",
              capacityStatus.color === "warning" && "text-warning",
              capacityStatus.color === "success" && "text-success",
              capacityStatus.color === "muted" && "text-muted-foreground",
            )}>
              {capacityStatus.label}
            </span>
          </div>

          {/* Capacity Bar */}
          <div className="w-24">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  capacityStatus.color === "destructive" && "bg-destructive",
                  capacityStatus.color === "warning" && "bg-warning",
                  capacityStatus.color === "success" && "bg-success",
                  capacityStatus.color === "muted" && "bg-muted-foreground",
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href={`/org/${orgSlug}/availability/${schedule.id}` as Route}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Link>
            {!isFull && onQuickBook && (
              <button
                onClick={() => onQuickBook(schedule.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Book
              </button>
            )}
            {isFull && (
              <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-muted text-muted-foreground">
                Full
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeSection({
  title,
  schedules,
  orgSlug,
  guides,
  onQuickBook,
  onAssignGuide,
  isAssigning,
}: {
  title: string;
  schedules: Schedule[];
  orgSlug: string;
  guides: Guide[];
  onQuickBook?: (scheduleId: string) => void;
  onAssignGuide: (scheduleId: string, guideId: string | null) => void;
  isAssigning: boolean;
}) {
  if (schedules.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-3">
        {schedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            orgSlug={orgSlug}
            guides={guides}
            onQuickBook={onQuickBook}
            onAssignGuide={onAssignGuide}
            isAssigning={isAssigning}
          />
        ))}
      </div>
    </div>
  );
}

export function DayView({ schedules, orgSlug, selectedDate, onQuickBook }: DayViewProps) {
  const grouped = groupByTimeOfDay(schedules);
  const hasSchedules = schedules.length > 0;
  const utils = trpc.useUtils();

  // Fetch guides for assignment
  const { data: guidesData } = trpc.guide.list.useQuery({
    pagination: { page: 1, limit: 100 },
  });
  const guides = guidesData?.data ?? [];

  // Update schedule guide mutation (use schedule update directly)
  const updateScheduleMutation = trpc.schedule.update.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      toast.success("Guide updated");
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Failed to update guide");
    },
  });

  const handleAssignGuide = (scheduleId: string, guideId: string | null) => {
    updateScheduleMutation.mutate({
      id: scheduleId,
      data: { guideId: guideId ?? undefined },
    });
  };

  const isAssigning = updateScheduleMutation.isPending;

  // Calculate day summary
  const totalCapacity = schedules.reduce((sum, s) => sum + s.maxParticipants, 0);
  const totalBooked = schedules.reduce((sum, s) => sum + (s.bookedCount ?? 0), 0);
  const totalAvailable = totalCapacity - totalBooked;
  const utilizationRate = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;
  const needsGuideCount = schedules.filter((s) => (s.bookedCount ?? 0) > 0 && !s.guide).length;

  if (!hasSchedules) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <CalendarDaysIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Tours Scheduled</h3>
        <p className="text-muted-foreground mb-4">
          There are no tours scheduled for this day.
        </p>
        <Link
          href={`/org/${orgSlug}/availability/new` as Route}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Schedule
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert for tours needing guides */}
      {needsGuideCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-warning">
              {needsGuideCount} tour{needsGuideCount > 1 ? "s" : ""} with bookings need guide assignment
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Click on "Assign Guide" below each tour to assign a guide
            </p>
          </div>
        </div>
      )}

      {/* Time Sections */}
      <div className="space-y-6">
        <TimeSection
          title="Morning"
          schedules={grouped.morning}
          orgSlug={orgSlug}
          guides={guides}
          onQuickBook={onQuickBook}
          onAssignGuide={handleAssignGuide}
          isAssigning={isAssigning}
        />
        <TimeSection
          title="Afternoon"
          schedules={grouped.afternoon}
          orgSlug={orgSlug}
          guides={guides}
          onQuickBook={onQuickBook}
          onAssignGuide={handleAssignGuide}
          isAssigning={isAssigning}
        />
        <TimeSection
          title="Evening"
          schedules={grouped.evening}
          orgSlug={orgSlug}
          guides={guides}
          onQuickBook={onQuickBook}
          onAssignGuide={handleAssignGuide}
          isAssigning={isAssigning}
        />
      </div>

      {/* Day Summary */}
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Day Summary</span>
          <div className="flex items-center gap-4">
            <span>
              <strong>{schedules.length}</strong> tours
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              <strong>{totalBooked}</strong>/{totalCapacity} booked ({utilizationRate}%)
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="text-success font-medium">
              <strong>{totalAvailable}</strong> spots available
            </span>
            {needsGuideCount > 0 && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-warning font-medium">
                  <strong>{needsGuideCount}</strong> need guides
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarDaysIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}
