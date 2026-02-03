"use client";

import { useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalendarDayCell, type DayStats } from "./calendar-day-cell";
import { DayPreviewPopover, type TourPreview, type DayPreviewStats } from "./day-preview-popover";

// =============================================================================
// TYPES
// =============================================================================

interface Schedule {
  id: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  bookedCount: number | null;
  maxParticipants: number;
  guidesRequired?: number | null;
  guidesAssigned?: number | null;
  tour?: {
    id: string;
    name: string;
    durationMinutes?: number;
  } | null;
}

interface OperationsCalendarProps {
  schedules: Schedule[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  orgSlug: string;
  // Optional: booking stats for alerts (pending payments, unconfirmed)
  bookingStats?: Record<string, { pendingPayments: number; unconfirmed: number; totalRevenue: number }>;
}

// =============================================================================
// UTILITIES
// =============================================================================

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getMonthDays(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: Date[] = [];

  // Add days from previous month to fill the first week
  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Add all days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add days from next month to complete the grid (6 rows)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OperationsCalendar({
  schedules,
  currentDate,
  onDateChange,
  orgSlug,
  bookingStats = {},
}: OperationsCalendarProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const grouped: Record<string, Schedule[]> = {};
    for (const schedule of schedules) {
      const date = new Date(schedule.startsAt);
      const key = getDateKey(date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(schedule);
    }
    // Sort each day's schedules by start time
    for (const key of Object.keys(grouped)) {
      const daySchedules = grouped[key];
      if (daySchedules) {
        daySchedules.sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        );
      }
    }
    return grouped;
  }, [schedules]);

  const getSchedulesForDate = useCallback(
    (date: Date): Schedule[] => {
      const key = getDateKey(date);
      return schedulesByDate[key] || [];
    },
    [schedulesByDate]
  );

  const getDayStats = useCallback(
    (date: Date): DayStats => {
      const daySchedules = getSchedulesForDate(date);
      const key = getDateKey(date);
      const stats = bookingStats[key] || { pendingPayments: 0, unconfirmed: 0, totalRevenue: 0 };

      const totalCapacity = daySchedules.reduce(
        (sum, s) => sum + s.maxParticipants,
        0
      );
      const totalGuests = daySchedules.reduce(
        (sum, s) => sum + (s.bookedCount ?? 0),
        0
      );
      const needsGuide = daySchedules.filter((s) => {
        const required = s.guidesRequired ?? 1;
        const assigned = s.guidesAssigned ?? 0;
        return assigned < required && (s.bookedCount ?? 0) > 0;
      }).length;

      return {
        tourCount: daySchedules.length,
        totalGuests,
        totalCapacity,
        needsGuide,
        pendingPayments: stats.pendingPayments,
        unconfirmed: stats.unconfirmed,
      };
    },
    [getSchedulesForDate, bookingStats]
  );

  const getPreviewStats = useCallback(
    (date: Date): DayPreviewStats => {
      const daySchedules = getSchedulesForDate(date);
      const key = getDateKey(date);
      const stats = bookingStats[key] || { pendingPayments: 0, unconfirmed: 0, totalRevenue: 0 };

      const totalGuests = daySchedules.reduce(
        (sum, s) => sum + (s.bookedCount ?? 0),
        0
      );
      const needsGuide = daySchedules.filter((s) => {
        const required = s.guidesRequired ?? 1;
        const assigned = s.guidesAssigned ?? 0;
        return assigned < required && (s.bookedCount ?? 0) > 0;
      }).length;

      return {
        totalGuests,
        totalRevenue: stats.totalRevenue,
        tourCount: daySchedules.length,
        needsGuide,
        pendingPayments: stats.pendingPayments,
        unconfirmed: stats.unconfirmed,
      };
    },
    [getSchedulesForDate, bookingStats]
  );

  const getTourPreviews = useCallback(
    (date: Date): TourPreview[] => {
      const daySchedules = getSchedulesForDate(date);
      return daySchedules.map((s) => ({
        id: s.id,
        name: s.tour?.name || "Unknown Tour",
        startsAt: s.startsAt,
        bookedCount: s.bookedCount ?? 0,
        maxParticipants: s.maxParticipants,
        needsGuide: (s.guidesAssigned ?? 0) < (s.guidesRequired ?? 1) && (s.bookedCount ?? 0) > 0,
        hasPendingPayments: false, // Will be populated when we have booking data
      }));
    },
    [getSchedulesForDate]
  );

  // Navigation
  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate]);
  const currentMonth = currentDate.getMonth();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <TooltipProvider>
      <div className="space-y-4" data-testid="operations-calendar">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth("next")}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <h2 className="ml-4 text-xl font-bold text-foreground">
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
              }).format(currentDate)}
            </h2>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {weekDays.map((day) => (
              <div
                key={day}
                className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {monthDays.map((date, idx) => {
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = isSameDay(date, today);
              const stats = getDayStats(date);
              const previewStats = getPreviewStats(date);
              const tourPreviews = getTourPreviews(date);
              const hasTours = stats.tourCount > 0;

              return (
                <div
                  key={idx}
                  className={cn(
                    "border-b border-r border-border",
                    !isCurrentMonth && "bg-muted/30"
                  )}
                >
                  {hasTours && isCurrentMonth ? (
                    <DayPreviewPopover
                      date={date}
                      stats={previewStats}
                      tours={tourPreviews}
                    >
                      <div>
                        <CalendarDayCell
                          date={date}
                          isCurrentMonth={isCurrentMonth}
                          isToday={isToday}
                          stats={stats}
                          orgSlug={orgSlug}
                        />
                      </div>
                    </DayPreviewPopover>
                  ) : (
                    <CalendarDayCell
                      date={date}
                      isCurrentMonth={isCurrentMonth}
                      isToday={isToday}
                      stats={stats}
                      orgSlug={orgSlug}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default OperationsCalendar;
