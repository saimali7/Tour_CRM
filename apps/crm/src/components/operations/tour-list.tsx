"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { TourCard, TourCardCompact } from "./tour-card";
import { getAssignmentStatus, type AssignmentStatusType } from "./assignment-status";
import { Sunrise, Sun, Sunset, Moon, Calendar } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

export interface TourItem {
  scheduleId: string;
  tourName: string;
  startsAt: Date | string;
  guestCount: number;
  bookingCount: number;
  assignedCount: number;
  guidesAssigned: number;
  guidesNeeded: number;
  isApproved?: boolean;
  isNotified?: boolean;
}

interface TourListProps {
  tours: TourItem[];
  orgSlug: string;
  isLoading?: boolean;
  className?: string;
}

type TimePeriod = "early" | "morning" | "afternoon" | "evening";

interface TimePeriodConfig {
  key: TimePeriod;
  label: string;
  icon: React.ReactNode;
  startHour: number;
  endHour: number;
}

const TIME_PERIODS: TimePeriodConfig[] = [
  { key: "early", label: "Early Morning", icon: <Moon className="h-4 w-4" />, startHour: 0, endHour: 7 },
  { key: "morning", label: "Morning", icon: <Sunrise className="h-4 w-4" />, startHour: 7, endHour: 12 },
  { key: "afternoon", label: "Afternoon", icon: <Sun className="h-4 w-4" />, startHour: 12, endHour: 17 },
  { key: "evening", label: "Evening", icon: <Sunset className="h-4 w-4" />, startHour: 17, endHour: 24 },
];

function getTimePeriod(date: Date): TimePeriod {
  const hour = date.getHours();
  if (hour < 7) return "early";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function TourList({ tours, orgSlug, isLoading, className }: TourListProps) {
  // Group tours by time period
  const groupedTours = useMemo(() => {
    const groups: Record<TimePeriod, (TourItem & { status: AssignmentStatusType })[]> = {
      early: [],
      morning: [],
      afternoon: [],
      evening: [],
    };

    tours
      .map((tour) => ({
        ...tour,
        status: getAssignmentStatus({
          totalBookings: tour.bookingCount,
          assignedBookings: tour.assignedCount,
          isApproved: tour.isApproved,
          isNotified: tour.isNotified,
        }),
      }))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .forEach((tour) => {
        const period = getTimePeriod(new Date(tour.startsAt));
        groups[period].push(tour);
      });

    return groups;
  }, [tours]);

  // Filter to periods that have tours
  const activePeriods = TIME_PERIODS.filter((p) => groupedTours[p.key].length > 0);

  if (isLoading) {
    return <TourListSkeleton className={className} />;
  }

  if (tours.length === 0) {
    return <TourListEmpty orgSlug={orgSlug} className={className} />;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {activePeriods.map((period) => (
        <TourPeriodGroup
          key={period.key}
          period={period}
          tours={groupedTours[period.key]}
          orgSlug={orgSlug}
        />
      ))}
    </div>
  );
}

interface TourPeriodGroupProps {
  period: TimePeriodConfig;
  tours: (TourItem & { status: AssignmentStatusType })[];
  orgSlug: string;
}

function TourPeriodGroup({ period, tours, orgSlug }: TourPeriodGroupProps) {
  const needsAttentionCount = tours.filter((t) => t.status === "needs_attention").length;

  return (
    <section>
      {/* Period Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          {period.icon}
          <h3 className="text-sm font-semibold uppercase tracking-wider">{period.label}</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium tabular-nums">
          {tours.length} {tours.length === 1 ? "tour" : "tours"}
        </span>
        {needsAttentionCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {needsAttentionCount} need{needsAttentionCount === 1 ? "s" : ""} attention
          </span>
        )}
      </div>

      {/* Tour Cards */}
      <div className="space-y-2">
        {tours.map((tour) => (
          <TourCard
            key={tour.scheduleId}
            scheduleId={tour.scheduleId}
            tourName={tour.tourName}
            startsAt={tour.startsAt}
            guestCount={tour.guestCount}
            bookingCount={tour.bookingCount}
            assignedCount={tour.assignedCount}
            guidesAssigned={tour.guidesAssigned}
            guidesNeeded={tour.guidesNeeded}
            status={tour.status}
            orgSlug={orgSlug}
          />
        ))}
      </div>
    </section>
  );
}

function TourListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {[1, 2].map((group) => (
        <div key={group}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-4 w-12 skeleton rounded" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border"
              >
                <div className="h-5 w-16 skeleton rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-32 skeleton rounded" />
                  <div className="h-3 w-48 skeleton rounded" />
                </div>
                <div className="h-6 w-12 skeleton rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TourListEmpty({ orgSlug, className }: { orgSlug: string; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed border-border/60 p-10 text-center bg-gradient-to-b from-muted/20 to-muted/40",
        className
      )}
    >
      <div className="flex justify-center mb-4">
        <div className="h-14 w-14 rounded-2xl bg-muted/80 flex items-center justify-center">
          <Calendar className="h-7 w-7 text-muted-foreground/70" />
        </div>
      </div>
      <p className="text-base font-semibold text-foreground mb-1">No tours scheduled</p>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
        This day looks clear. Switch to another date or create new schedules.
      </p>
      <Link
        href={`/org/${orgSlug}/availability` as Route}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
      >
        Manage Availability
      </Link>
    </div>
  );
}

// Compact list for mobile - shows all tours without grouping
export function TourListCompact({
  tours,
  orgSlug,
  className,
}: Omit<TourListProps, "isLoading">) {
  const sortedTours = useMemo(
    () =>
      tours
        .map((tour) => ({
          ...tour,
          status: getAssignmentStatus({
            totalBookings: tour.bookingCount,
            assignedBookings: tour.assignedCount,
            isApproved: tour.isApproved,
            isNotified: tour.isNotified,
          }),
        }))
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [tours]
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      {sortedTours.map((tour) => (
        <TourCardCompact
          key={tour.scheduleId}
          scheduleId={tour.scheduleId}
          tourName={tour.tourName}
          startsAt={tour.startsAt}
          guestCount={tour.guestCount}
          status={tour.status}
          orgSlug={orgSlug}
        />
      ))}
    </div>
  );
}
