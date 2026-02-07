"use client";

import { useState, useMemo } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users, Clock, AlertCircle } from "lucide-react";

interface DateTimeSectionProps {
  tourId: string;
  selectedDate: string | null; // YYYY-MM-DD
  selectedTime: string | null; // HH:MM
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  disabled?: boolean;
}

// Type for the slot from the availability API
type DateSlot = RouterOutputs["availability"]["getAvailableDatesForMonth"]["dates"][number]["slots"][number];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatTime(time: string): string {
  const parts = time.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function DateTimeSection({
  tourId,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  disabled = false,
}: DateTimeSectionProps) {
  // Track current month/year for calendar navigation
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-12
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Fetch available dates for the current month view
  const { data: monthAvailability, isLoading: loadingDates } =
    trpc.availability.getAvailableDatesForMonth.useQuery(
      {
        tourId,
        year: viewYear,
        month: viewMonth,
      },
      {
        enabled: !!tourId,
      }
    );

  // Create a map of date -> availability data for quick lookup
  const availabilityMap = useMemo(() => {
    if (!monthAvailability?.dates) return new Map();
    return new Map(monthAvailability.dates.map((d) => [d.date, d]));
  }, [monthAvailability?.dates]);

  // Get slots for the selected date
  const selectedDateSlots: DateSlot[] = useMemo(() => {
    if (!selectedDate) return [];
    const dateData = availabilityMap.get(selectedDate);
    if (!dateData || dateData.isBlackedOut) return [];
    return dateData.slots.filter((slot: DateSlot) => slot.available);
  }, [selectedDate, availabilityMap]);

  // Calendar navigation handlers
  const goToPreviousMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
    // Clear selected date/time when changing months
    if (selectedDate) {
      onDateChange("");
      onTimeChange("");
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    // Clear selected date/time when changing months
    if (selectedDate) {
      onDateChange("");
      onTimeChange("");
    }
  };

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const lastDay = new Date(viewYear, viewMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: Array<{
      day: number | null;
      dateStr: string;
      isAvailable: boolean;
      isBlackedOut: boolean;
      isPast: boolean;
      hasSlots: boolean;
      totalSpots: number;
    }> = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        day: null,
        dateStr: "",
        isAvailable: false,
        isBlackedOut: false,
        isPast: false,
        hasSlots: false,
        totalSpots: 0,
      });
    }

    // Add days of the month
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const availability = availabilityMap.get(dateStr);
      const isPast = dateStr < todayStr;
      const isBlackedOut = availability?.isBlackedOut ?? false;
      const hasAvailableSlots = availability?.slots.some((s: DateSlot) => s.available) ?? false;

      // Calculate total available spots
      const totalSpots = availability?.slots.reduce((sum: number, s: DateSlot) => sum + s.spotsRemaining, 0) ?? 0;

      days.push({
        day,
        dateStr,
        isAvailable: !isPast && !isBlackedOut && hasAvailableSlots,
        isBlackedOut,
        isPast,
        hasSlots: hasAvailableSlots,
        totalSpots,
      });
    }

    return days;
  }, [viewYear, viewMonth, availabilityMap, today]);

  // Check if we can go to previous month (don't allow past months)
  const canGoPrevious = useMemo(() => {
    if (viewYear > today.getFullYear()) return true;
    if (viewYear === today.getFullYear() && viewMonth > today.getMonth() + 1) return true;
    return false;
  }, [viewYear, viewMonth, today]);

  // Handle date selection
  const handleDateClick = (dateStr: string, isAvailable: boolean) => {
    if (!isAvailable || disabled) return;
    onDateChange(dateStr);
    onTimeChange(""); // Reset time when date changes
  };

  // Handle time selection
  const handleTimeClick = (time: string) => {
    if (disabled) return;
    onTimeChange(time);
  };

  // Don't render if no tour selected
  if (!tourId) {
    return null;
  }

  return (
    <div className="space-y-6 md:col-span-2">
      {/* Calendar Section */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Select Date *
        </label>
        <div className="border border-border rounded-lg bg-card p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
              disabled={!canGoPrevious || disabled}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold text-foreground">
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              disabled={disabled}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Loading state */}
          {loadingDates && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground text-sm">
                Loading availability...
              </div>
            </div>
          )}

          {/* Calendar Grid */}
          {!loadingDates && (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="text-center text-xs font-medium text-muted-foreground py-1"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayInfo, index) => {
                  if (dayInfo.day === null) {
                    return <div key={`empty-${index}`} className="h-10" />;
                  }

                  const isSelected = selectedDate === dayInfo.dateStr;

                  return (
                    <button
                      key={dayInfo.dateStr}
                      type="button"
                      onClick={() => handleDateClick(dayInfo.dateStr, dayInfo.isAvailable)}
                      disabled={!dayInfo.isAvailable || disabled}
                      className={cn(
                        "h-10 rounded-md text-sm font-medium transition-colors relative",
                        // Base styles
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        // Available and selectable
                        dayInfo.isAvailable && !isSelected && [
                          "bg-primary/10 text-primary hover:bg-primary/20",
                          "cursor-pointer",
                        ],
                        // Selected state
                        isSelected && [
                          "bg-primary text-primary-foreground",
                          "hover:bg-primary/90",
                        ],
                        // Unavailable states
                        !dayInfo.isAvailable && [
                          "text-muted-foreground/50",
                          "cursor-not-allowed",
                        ],
                        // Blacked out
                        dayInfo.isBlackedOut && "bg-destructive/10 line-through",
                        // Past date
                        dayInfo.isPast && "text-muted-foreground/30"
                      )}
                    >
                      {dayInfo.day}
                      {/* Availability indicator dot */}
                      {dayInfo.isAvailable && dayInfo.totalSpots > 0 && dayInfo.totalSpots <= 5 && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-warning" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-primary/10" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-primary" />
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  <span>Low availability</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Time Slots Section */}
      {selectedDate && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Time *
          </label>

          {selectedDateSlots.length === 0 ? (
            <div className="border border-border rounded-lg bg-muted/50 p-6 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No available time slots for this date
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {selectedDateSlots.map((slot: DateSlot) => {
                const isSelected = selectedTime === slot.time;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => handleTimeClick(slot.time)}
                    disabled={disabled}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(slot.time)}
                    </div>
                    {slot.label && (
                      <span
                        className={cn(
                          "text-xs mt-0.5",
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        {slot.label}
                      </span>
                    )}
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs mt-1",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                        slot.almostFull && !isSelected && "text-warning"
                      )}
                    >
                      <Users className="h-3 w-3" />
                      <span>
                        {slot.spotsRemaining} of {slot.maxCapacity} spots
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected Summary */}
      {selectedDate && selectedTime && (
        <div className="bg-muted rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Selected Date & Time
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Time</p>
              <p className="font-medium">{formatTime(selectedTime)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
