"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Users, Clock, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { QuickGuideAssign } from "@/components/guides/QuickGuideAssign";

type CalendarView = "month" | "week" | "day";

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

interface AvailabilityCalendarProps {
  schedules: Schedule[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  orgSlug: string;
}

// Utility functions
function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

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

function getWeekDays(date: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);

  // Start from Sunday
  const day = current.getDay();
  current.setDate(current.getDate() - day);

  for (let i = 0; i < 7; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getCapacityColor(booked: number, max: number): string {
  if (max === 0) return "bg-muted";
  const percent = (booked / max) * 100;
  if (percent >= 100) return "bg-destructive";
  if (percent >= 80) return "bg-warning";
  if (percent >= 50) return "bg-amber-400";
  return "bg-success";
}

function getCapacityTextColor(booked: number, max: number): string {
  if (max === 0) return "text-muted-foreground";
  const percent = (booked / max) * 100;
  if (percent >= 100) return "text-destructive";
  if (percent >= 80) return "text-warning";
  return "text-success";
}

export function AvailabilityCalendar({
  schedules,
  currentDate,
  onDateChange,
  orgSlug,
}: AvailabilityCalendarProps) {
  const [view, setView] = useState<CalendarView>("month");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const grouped: Record<string, Schedule[]> = {};
    for (const schedule of schedules) {
      const date = new Date(schedule.startsAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(schedule);
    }
    // Sort each day's schedules by start time
    for (const key of Object.keys(grouped)) {
      const daySchedules = grouped[key];
      if (daySchedules) {
        daySchedules.sort((a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        );
      }
    }
    return grouped;
  }, [schedules]);

  const getSchedulesForDate = (date: Date): Schedule[] => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return schedulesByDate[key] || [];
  };

  const getDayStats = (date: Date) => {
    const daySchedules = getSchedulesForDate(date);
    const totalCapacity = daySchedules.reduce((sum, s) => sum + s.maxParticipants, 0);
    const totalBooked = daySchedules.reduce((sum, s) => sum + (s.bookedCount ?? 0), 0);
    const needsGuide = daySchedules.filter(s => {
      const required = s.guidesRequired ?? 1;
      const assigned = s.guidesAssigned ?? 0;
      return assigned < required;
    }).length;
    return {
      count: daySchedules.length,
      totalCapacity,
      totalBooked,
      spotsLeft: totalCapacity - totalBooked,
      needsGuide,
      utilization: totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0
    };
  };

  // Navigation handlers
  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    onDateChange(newDate);
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    onDateChange(newDate);
  };

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const selectDate = (date: Date) => {
    onDateChange(date);
    if (view === "month") {
      setView("day");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              view === "month" ? navigateMonth("prev") :
              view === "week" ? navigateWeek("prev") :
              navigateDay("prev")
            }
            className="p-2 rounded-lg border border-input hover:bg-accent transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-input hover:bg-accent transition-colors"
          >
            Today
          </button>
          <button
            onClick={() =>
              view === "month" ? navigateMonth("next") :
              view === "week" ? navigateWeek("next") :
              navigateDay("next")
            }
            className="p-2 rounded-lg border border-input hover:bg-accent transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Current period label */}
          <h2 className="ml-4 text-lg font-semibold text-foreground">
            {view === "month" && new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(currentDate)}
            {view === "week" && (() => {
              const weekDays = getWeekDays(currentDate);
              const first = weekDays[0];
              const last = weekDays[6];
              if (!first || !last) return "";
              if (first.getMonth() === last.getMonth()) {
                return `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(first)} ${first.getDate()} - ${last.getDate()}, ${first.getFullYear()}`;
              }
              return `${new Intl.DateTimeFormat("en-US", { month: "short" }).format(first)} ${first.getDate()} - ${new Intl.DateTimeFormat("en-US", { month: "short" }).format(last)} ${last.getDate()}, ${first.getFullYear()}`;
            })()}
            {view === "day" && new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(currentDate)}
          </h2>
        </div>

        {/* View Toggle */}
        <div className="flex rounded-lg border border-input bg-background p-1">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Month View */}
      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          today={today}
          getSchedulesForDate={getSchedulesForDate}
          getDayStats={getDayStats}
          onSelectDate={selectDate}
          orgSlug={orgSlug}
        />
      )}

      {/* Week View */}
      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          today={today}
          getSchedulesForDate={getSchedulesForDate}
          getDayStats={getDayStats}
          onSelectDate={selectDate}
          orgSlug={orgSlug}
        />
      )}

      {/* Day View */}
      {view === "day" && (
        <DayView
          currentDate={currentDate}
          schedules={getSchedulesForDate(currentDate)}
          orgSlug={orgSlug}
        />
      )}
    </div>
  );
}

// Month View Component
function MonthView({
  currentDate,
  today,
  getSchedulesForDate,
  getDayStats,
  onSelectDate,
  orgSlug,
}: {
  currentDate: Date;
  today: Date;
  getSchedulesForDate: (date: Date) => Schedule[];
  getDayStats: (date: Date) => { count: number; totalCapacity: number; totalBooked: number; spotsLeft: number; needsGuide: number; utilization: number };
  onSelectDate: (date: Date) => void;
  orgSlug: string;
}) {
  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate]);
  const currentMonth = currentDate.getMonth();

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {weekDays.map((day) => (
          <div key={day} className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {monthDays.map((date, idx) => {
          const isCurrentMonth = date.getMonth() === currentMonth;
          const isToday = isSameDay(date, today);
          const stats = getDayStats(date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const daySchedules = getSchedulesForDate(date);
          const hasSchedules = stats.count > 0 && isCurrentMonth;

          const dayCellContent = (
            <button
              onClick={() => onSelectDate(date)}
              className={cn(
                "group/cell w-full min-h-[100px] p-2 border-b border-r border-border text-left",
                "transition-all duration-150 ease-out",
                "hover:bg-accent/60 hover:shadow-sm hover:z-10 hover:scale-[1.01]",
                "active:scale-[0.99] active:shadow-none",
                !isCurrentMonth && "bg-muted/20 hover:bg-muted/40",
                isWeekend && isCurrentMonth && "bg-muted/5",
                isToday && "ring-2 ring-inset ring-primary bg-primary/5"
              )}
            >
              {/* Date number */}
              <div className={cn(
                "text-sm font-semibold mb-1.5 transition-colors",
                isCurrentMonth ? "text-foreground" : "text-muted-foreground/60",
                isToday && "text-primary",
                "group-hover/cell:text-primary"
              )}>
                {date.getDate()}
              </div>

              {/* Day summary */}
              {hasSchedules && (
                <div className="space-y-1.5">
                  {/* Tour count badge */}
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold",
                      "transition-all duration-150",
                      stats.utilization >= 80
                        ? "bg-success/15 text-success ring-1 ring-success/20"
                        : "bg-primary/10 text-primary ring-1 ring-primary/10"
                    )}>
                      {stats.count} tour{stats.count !== 1 ? "s" : ""}
                    </span>
                    {stats.needsGuide > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-warning/15 text-warning ring-1 ring-warning/30 animate-pulse">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-[10px] font-bold">{stats.needsGuide}</span>
                      </span>
                    )}
                  </div>

                  {/* Capacity bar - enhanced */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-muted/80 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300 ease-out",
                          getCapacityColor(stats.totalBooked, stats.totalCapacity)
                        )}
                        style={{ width: `${Math.min(100, stats.utilization)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-medium">
                      <span className="text-muted-foreground tabular-nums">{stats.totalBooked}/{stats.totalCapacity}</span>
                      <span className={cn("tabular-nums", getCapacityTextColor(stats.totalBooked, stats.totalCapacity))}>
                        {stats.spotsLeft} left
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </button>
          );

          // Wrap days with schedules in HoverCard for preview
          if (hasSchedules) {
            return (
              <HoverCard key={idx} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  {dayCellContent}
                </HoverCardTrigger>
                <HoverCardContent
                  side="right"
                  align="start"
                  className="w-80 p-0 shadow-xl border-border/80 animate-in fade-in-0 zoom-in-95 duration-200"
                  sideOffset={12}
                >
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-border bg-gradient-to-b from-muted/50 to-transparent">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-foreground">
                          {new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date)}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10">
                        <Users className="h-3 w-3 text-primary" />
                        <span className="text-xs font-semibold text-primary tabular-nums">
                          {stats.totalBooked}/{stats.totalCapacity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tour list */}
                  <div className="divide-y divide-border/50 max-h-[280px] overflow-y-auto">
                    {daySchedules.slice(0, 5).map((schedule, idx) => {
                      const booked = schedule.bookedCount ?? 0;
                      const max = schedule.maxParticipants;
                      const remaining = max - booked;

                      return (
                        <div
                          key={schedule.id}
                          className="px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Time badge */}
                              <div className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary">
                                <Clock className="h-3 w-3 mr-1" />
                                <span className="text-xs font-bold tabular-nums">
                                  {formatTime(schedule.startsAt)}
                                </span>
                              </div>
                              {/* Tour name */}
                              <div className="text-sm font-semibold text-foreground truncate mt-1.5">
                                {schedule.tour?.name ?? "Unknown Tour"}
                              </div>
                              {/* Guide */}
                              <div className="flex items-center gap-1.5 mt-1.5">
                                {(() => {
                                  const required = schedule.guidesRequired ?? 1;
                                  const assigned = schedule.guidesAssigned ?? 0;
                                  if (assigned < required) {
                                    return (
                                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning/15 text-warning">
                                        <AlertCircle className="h-3 w-3" />
                                        <span className="text-xs font-semibold">
                                          Needs {required - assigned} guide{required - assigned !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/15 text-success">
                                      <span className="text-xs font-semibold">
                                        {assigned} guide{assigned !== 1 ? 's' : ''} assigned
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            {/* Capacity */}
                            <div className="flex flex-col items-end gap-1">
                              <span className={cn(
                                "text-sm font-bold tabular-nums",
                                remaining === 0 ? "text-destructive" : remaining <= 3 ? "text-warning" : "text-success"
                              )}>
                                {remaining}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                of {max} left
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {daySchedules.length > 5 && (
                      <div className="px-4 py-2.5 text-xs text-muted-foreground text-center bg-muted/30">
                        +{daySchedules.length - 5} more tour{daySchedules.length - 5 !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t border-border bg-gradient-to-t from-muted/50 to-transparent">
                    <button
                      onClick={() => onSelectDate(date)}
                      className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-all hover:gap-3"
                    >
                      View full day
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          }

          return <div key={idx}>{dayCellContent}</div>;
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success" />
          <span>&lt;50%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-400" />
          <span>50-80%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-warning" />
          <span>80-100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-destructive" />
          <span>Full</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <AlertCircle className="h-3 w-3 text-warning" />
          <span>Needs guide</span>
        </div>
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  currentDate,
  today,
  getSchedulesForDate,
  getDayStats,
  onSelectDate,
  orgSlug,
}: {
  currentDate: Date;
  today: Date;
  getSchedulesForDate: (date: Date) => Schedule[];
  getDayStats: (date: Date) => { count: number; totalCapacity: number; totalBooked: number; spotsLeft: number; needsGuide: number; utilization: number };
  onSelectDate: (date: Date) => void;
  orgSlug: string;
}) {
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-border">
        {weekDays.map((date) => {
          const isToday = isSameDay(date, today);
          const isPast = date < today;
          const schedules = getSchedulesForDate(date);
          const stats = getDayStats(date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <div
              key={date.toISOString()}
              className={cn(
                "min-h-[500px] flex flex-col",
                isPast && "opacity-60",
                isWeekend && "bg-muted/10"
              )}
            >
              {/* Day header */}
              <button
                onClick={() => onSelectDate(date)}
                className={cn(
                  "p-3 border-b border-border text-center hover:bg-muted/50 transition-colors",
                  isToday && "bg-primary/5"
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)}
                </div>
                <div className={cn(
                  "text-2xl font-bold",
                  isToday ? "text-primary" : "text-foreground"
                )}>
                  {date.getDate()}
                </div>
                {stats.count > 0 && (
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {stats.count} tour{stats.count !== 1 ? "s" : ""}
                    </span>
                    <span className={cn("text-xs font-medium", getCapacityTextColor(stats.totalBooked, stats.totalCapacity))}>
                      {stats.spotsLeft} left
                    </span>
                  </div>
                )}
              </button>

              {/* Schedules */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {schedules.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    No tours
                  </div>
                ) : (
                  schedules.map((schedule, idx) => {
                    const booked = schedule.bookedCount ?? 0;
                    const max = schedule.maxParticipants;
                    const remaining = max - booked;
                    const percent = max > 0 ? Math.round((booked / max) * 100) : 0;

                    return (
                      <Link
                        key={schedule.id}
                        href={`/org/${orgSlug}/schedules/${schedule.id}` as Route}
                        className={cn(
                          "group/card block rounded-lg p-2.5 text-xs",
                          "transition-all duration-150 ease-out",
                          "hover:ring-2 hover:ring-primary/40 hover:shadow-md hover:-translate-y-0.5",
                          "active:translate-y-0 active:shadow-sm",
                          percent >= 100
                            ? "bg-destructive/10 ring-1 ring-destructive/20"
                            : percent >= 80
                            ? "bg-warning/10 ring-1 ring-warning/20"
                            : "bg-muted/50 ring-1 ring-border/50"
                        )}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {/* Time */}
                        <div className="font-bold text-foreground tabular-nums">
                          {formatTime(schedule.startsAt)}
                        </div>
                        {/* Tour name */}
                        <div className="text-muted-foreground truncate mt-0.5 font-medium group-hover/card:text-foreground transition-colors" title={schedule.tour?.name ?? "Unknown"}>
                          {schedule.tour?.name ?? "Unknown"}
                        </div>
                        {/* Guide */}
                        <div className="mt-1.5" onClick={(e) => e.preventDefault()}>
                          <QuickGuideAssign
                            scheduleId={schedule.id}
                            compact
                          />
                        </div>
                        {/* Capacity */}
                        <div className="flex items-center gap-1.5 mt-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className={cn(
                            "font-bold tabular-nums",
                            remaining === 0 ? "text-destructive" : remaining <= 3 ? "text-warning" : "text-success"
                          )}>
                            {remaining}
                          </span>
                          <span className="text-muted-foreground/70 text-[10px]">of {max}</span>
                        </div>
                        {/* Capacity bar */}
                        <div className="w-full h-1.5 bg-muted/80 rounded-full mt-1.5 overflow-hidden shadow-inner">
                          <div
                            className={cn("h-full rounded-full transition-all duration-300", getCapacityColor(booked, max))}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Day View Component
function DayView({
  currentDate,
  schedules,
  orgSlug,
}: {
  currentDate: Date;
  schedules: Schedule[];
  orgSlug: string;
}) {
  // Group by time slot
  const groupedSchedules = useMemo(() => {
    const groups: Record<"Morning" | "Afternoon" | "Evening", Schedule[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };

    for (const schedule of schedules) {
      const hour = new Date(schedule.startsAt).getHours();
      if (hour < 12) groups.Morning.push(schedule);
      else if (hour < 17) groups.Afternoon.push(schedule);
      else groups.Evening.push(schedule);
    }

    return groups;
  }, [schedules]);

  // Summary stats
  const stats = useMemo(() => {
    const totalCapacity = schedules.reduce((sum, s) => sum + s.maxParticipants, 0);
    const totalBooked = schedules.reduce((sum, s) => sum + (s.bookedCount ?? 0), 0);
    const needsGuide = schedules.filter(s => {
      const required = s.guidesRequired ?? 1;
      const assigned = s.guidesAssigned ?? 0;
      return assigned < required;
    }).length;
    return {
      count: schedules.length,
      totalBooked,
      totalCapacity,
      spotsLeft: totalCapacity - totalBooked,
      needsGuide,
      utilization: totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0,
    };
  }, [schedules]);

  if (schedules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-12 text-center">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-2">No tours scheduled for this day</p>
        <p className="text-sm text-muted-foreground">
          Create schedules from individual tour pages
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tours</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.count}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booked</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.totalBooked}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Spots Left</div>
          <div className={cn(
            "text-2xl font-bold mt-1",
            stats.spotsLeft > 10 ? "text-success" : stats.spotsLeft > 0 ? "text-warning" : "text-destructive"
          )}>
            {stats.spotsLeft}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Utilization</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.utilization}%</div>
        </div>
        {stats.needsGuide > 0 && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
            <div className="text-xs font-medium text-warning uppercase tracking-wider">Needs Guide</div>
            <div className="text-2xl font-bold text-warning mt-1">{stats.needsGuide}</div>
          </div>
        )}
      </div>

      {/* Schedule Groups */}
      {(["Morning", "Afternoon", "Evening"] as const).map((slot) => {
        const slotSchedules = groupedSchedules[slot];
        if (slotSchedules.length === 0) return null;

        return (
          <div key={slot} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{slot}</h3>
              <span className="text-xs text-muted-foreground">
                ({slotSchedules.length} tour{slotSchedules.length !== 1 ? "s" : ""})
              </span>
            </div>

            <div className="grid gap-3">
              {slotSchedules.map((schedule) => {
                const booked = schedule.bookedCount ?? 0;
                const max = schedule.maxParticipants;
                const remaining = max - booked;
                const percent = max > 0 ? Math.round((booked / max) * 100) : 0;

                return (
                  <Link
                    key={schedule.id}
                    href={`/org/${orgSlug}/schedules/${schedule.id}` as Route}
                    className="group rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Time + Tour Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Time */}
                        <div className="flex-shrink-0 w-20">
                          <div className="text-lg font-bold text-foreground">
                            {formatTime(schedule.startsAt)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {schedule.tour?.durationMinutes ?? 60} min
                          </div>
                        </div>

                        {/* Tour Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {schedule.tour?.name ?? "Unknown Tour"}
                          </div>
                          <div className="mt-1" onClick={(e) => e.preventDefault()}>
                            <QuickGuideAssign
                              scheduleId={schedule.id}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Booking Stats */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className={cn(
                              "text-lg font-bold",
                              remaining === 0 ? "text-destructive" : remaining <= 3 ? "text-warning" : "text-success"
                            )}>
                              {remaining}
                            </span>
                            <span className="text-sm text-muted-foreground">left</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", getCapacityColor(booked, max))}
                                style={{ width: `${Math.min(100, percent)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-14 text-right">
                              {booked}/{max}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
