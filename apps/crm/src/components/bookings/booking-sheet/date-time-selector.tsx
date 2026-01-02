"use client";

import { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface TimeSlot {
  time: string;
  label: string | null;
  available: boolean;
}

export interface DateTimeSelectorProps {
  // Date selection
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  dateScrollOffset: number;
  onDateScrollOffsetChange: (offset: number) => void;
  // Time selection
  selectedTime: string;
  onTimeChange: (time: string) => void;
  timeSlots: TimeSlot[];
  isLoadingTimeSlots: boolean;
  // Next available hint
  nextAvailableDate: Date | null;
  // Validation
  timeError?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateDateRange(days: number = 21): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDateLabel(date: Date): { day: string; weekday: string; isToday: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = date.getTime() === today.getTime();

  return {
    day: date.getDate().toString(),
    weekday: isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" }),
    isToday,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DateTimeSelector({
  selectedDate,
  onDateChange,
  dateScrollOffset,
  onDateScrollOffsetChange,
  selectedTime,
  onTimeChange,
  timeSlots,
  isLoadingTimeSlots,
  nextAvailableDate,
  timeError,
}: DateTimeSelectorProps) {
  const dates = useMemo(() => generateDateRange(21), []);
  const visibleDates = dates.slice(dateScrollOffset, dateScrollOffset + 7);

  const handleDateSelect = (date: Date) => {
    onDateChange(date);
    onTimeChange("");
  };

  const handleJumpToNextAvailable = () => {
    if (!nextAvailableDate) return;
    onDateChange(nextAvailableDate);
    // Calculate scroll offset to show the date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((nextAvailableDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    onDateScrollOffsetChange(Math.min(Math.max(0, daysDiff - 3), dates.length - 7));
    onTimeChange("");
  };

  return (
    <>
      {/* Date Section */}
      <section className="space-y-3">
        <label className="text-sm font-medium text-foreground">Date</label>
        <div className="flex items-center gap-1">
          {/* Week back button */}
          <button
            type="button"
            onClick={() => onDateScrollOffsetChange(Math.max(0, dateScrollOffset - 7))}
            disabled={dateScrollOffset === 0}
            className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous week"
          >
            <div className="flex">
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4 -ml-2.5" />
            </div>
          </button>
          {/* Day back button */}
          <button
            type="button"
            onClick={() => onDateScrollOffsetChange(Math.max(0, dateScrollOffset - 1))}
            disabled={dateScrollOffset === 0}
            className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 flex gap-1">
            {visibleDates.map((date) => {
              const { day, weekday, isToday } = formatDateLabel(date);
              const isSelected = date.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleDateSelect(date)}
                  className={cn(
                    "flex-1 py-2 px-1 rounded-lg border-2 text-center transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                    isToday && !isSelected && "bg-accent"
                  )}
                >
                  <p className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                    {weekday}
                  </p>
                  <p className={cn("text-lg font-bold", isSelected ? "text-primary" : "text-foreground")}>
                    {day}
                  </p>
                </button>
              );
            })}
          </div>
          {/* Day forward button */}
          <button
            type="button"
            onClick={() => onDateScrollOffsetChange(Math.min(dates.length - 7, dateScrollOffset + 1))}
            disabled={dateScrollOffset >= dates.length - 7}
            className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {/* Week forward button */}
          <button
            type="button"
            onClick={() => onDateScrollOffsetChange(Math.min(dates.length - 7, dateScrollOffset + 7))}
            disabled={dateScrollOffset >= dates.length - 7}
            className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next week"
          >
            <div className="flex">
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4 -ml-2.5" />
            </div>
          </button>
        </div>
      </section>

      {/* Time Slots Section */}
      <section className="space-y-3">
        <label className="text-sm font-medium text-foreground">Time</label>
        {isLoadingTimeSlots ? (
          /* Loading skeleton */
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3 rounded-lg border-2 border-border animate-pulse">
                <div className="h-5 w-16 bg-muted rounded mx-auto mb-1" />
                <div className="h-3 w-12 bg-muted rounded mx-auto" />
              </div>
            ))}
          </div>
        ) : timeSlots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => onTimeChange(slot.time)}
                  className={cn(
                    "p-3 rounded-lg border-2 text-center transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <p className={cn("font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                    {slot.time}
                  </p>
                  {slot.label && (
                    <p className="text-[10px] text-muted-foreground truncate max-w-full px-1">
                      {slot.label}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center bg-muted/50 rounded-lg border border-dashed border-border">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No time slots configured</p>
            {nextAvailableDate ? (
              <button
                type="button"
                onClick={handleJumpToNextAvailable}
                className="text-xs text-primary hover:underline mt-2 font-medium"
              >
                Next available: {nextAvailableDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Configure departure times for this tour</p>
            )}
          </div>
        )}
        {timeError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {timeError}
          </p>
        )}
      </section>
    </>
  );
}
