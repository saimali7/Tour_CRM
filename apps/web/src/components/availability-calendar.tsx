"use client";

import { useState, useMemo, useRef, useEffect, useCallback, type TouchEventHandler } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { Button } from "@tour/ui";
import { formatLocalDateKey } from "@/lib/booking-context";

// Types matching the TourAvailabilityService output
interface DateSlot {
  time: string;
  label?: string;
  spotsRemaining: number;
  maxCapacity: number;
  bookedCount: number;
  available: boolean;
  almostFull: boolean;
}

interface AvailableDate {
  date: string; // ISO date YYYY-MM-DD
  slots: DateSlot[];
  isBlackedOut: boolean;
  blackoutReason?: string;
}

interface AvailabilityCalendarProps {
  availableDates: AvailableDate[];
  currency: string;
  tourId: string;
  organizationSlug: string;
  tourSlug: string;
  initialYear: number;
  initialMonth: number;
}

function formatTime(time: string): string {
  // time is in HH:MM format
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours!, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function groupDatesByMonth(dates: AvailableDate[]): Record<string, AvailableDate[]> {
  const grouped: Record<string, AvailableDate[]> = {};

  for (const availability of dates) {
    const monthKey = availability.date.slice(0, 7);
    const existing = grouped[monthKey] ?? [];
    grouped[monthKey] = [...existing, availability];
  }

  return grouped;
}

export function AvailabilityCalendar({
  availableDates,
  currency: _currency,
  tourId,
  organizationSlug,
  tourSlug,
  initialYear,
  initialMonth,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(initialYear, initialMonth - 1, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loadingMonthKey, setLoadingMonthKey] = useState<string | null>(null);
  const [monthLoadError, setMonthLoadError] = useState<string | null>(null);
  const [monthAnimation, setMonthAnimation] = useState<"slide-left" | "slide-right" | null>(null);
  const [monthDateMap, setMonthDateMap] = useState<Record<string, AvailableDate[]>>(() =>
    groupDatesByMonth(availableDates)
  );
  const inFlightMonthsRef = useRef(new Set<string>());
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    setMonthDateMap((prev) => {
      const merged = { ...prev };
      let changed = false;

      for (const availability of availableDates) {
        const monthKey = availability.date.slice(0, 7);
        const existingDates = merged[monthKey] ?? [];
        const existingIndex = existingDates.findIndex((item) => item.date === availability.date);

        if (existingIndex === -1) {
          merged[monthKey] = [...existingDates, availability];
          changed = true;
          continue;
        }

        const existing = existingDates[existingIndex];
        if (existing !== availability) {
          const nextDates = [...existingDates];
          nextDates[existingIndex] = availability;
          merged[monthKey] = nextDates;
          changed = true;
        }
      }

      return changed ? merged : prev;
    });
  }, [availableDates]);

  const currentMonthKey = getMonthKey(currentMonth);
  const loadedDateCount = useMemo(
    () => Object.values(monthDateMap).reduce((sum, dates) => sum + dates.length, 0),
    [monthDateMap]
  );

  const ensureMonthAvailability = useCallback(
    async (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = getMonthKey(date);

      if (monthDateMap[monthKey] || inFlightMonthsRef.current.has(monthKey)) {
        return;
      }

      inFlightMonthsRef.current.add(monthKey);
      setLoadingMonthKey(monthKey);
      setMonthLoadError(null);

      try {
        const response = await fetch(
          `/api/availability/month?tourId=${encodeURIComponent(tourId)}&year=${year}&month=${month}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to load calendar month");
        }

        const payload = await response.json();
        const fetchedDates = Array.isArray(payload?.dates)
          ? (payload.dates as AvailableDate[])
          : Array.isArray(payload?.availability?.dates)
          ? (payload.availability.dates as AvailableDate[])
          : [];

        setMonthDateMap((prev) => ({
          ...prev,
          [monthKey]: fetchedDates,
        }));
      } catch {
        setMonthLoadError("Unable to load this month. Please try again.");
      } finally {
        inFlightMonthsRef.current.delete(monthKey);
        setLoadingMonthKey((current) => (current === monthKey ? null : current));
      }
    },
    [monthDateMap, tourId]
  );

  useEffect(() => {
    void ensureMonthAvailability(currentMonth);
  }, [currentMonth, ensureMonthAvailability]);

  // Create a map of available dates for quick lookup
  const availableDatesMap = useMemo(() => {
    const map = new Map<string, AvailableDate>();

    for (const monthDates of Object.values(monthDateMap)) {
      for (const availability of monthDates) {
        map.set(availability.date, availability);
      }
    }

    return map;
  }, [monthDateMap]);

  // Get all days in the current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week the month starts on (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();

  // Slots for selected date
  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = formatLocalDateKey(selectedDate);
    const dateData = availableDatesMap.get(dateKey);
    return dateData?.slots ?? [];
  }, [selectedDate, availableDatesMap]);

  const handlePrevMonth = () => {
    setMonthAnimation("slide-right");
    setCurrentMonth((prev) => subMonths(prev, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setMonthAnimation("slide-left");
    setCurrentMonth((prev) => addMonths(prev, 1));
    setSelectedDate(null);
  };

  const handleTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd: TouchEventHandler<HTMLDivElement> = (event) => {
    if (touchStartXRef.current === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(delta) < 45) {
      return;
    }

    if (delta > 0) {
      handlePrevMonth();
    } else {
      handleNextMonth();
    }
  };

  useEffect(() => {
    if (!monthAnimation) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMonthAnimation(null);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [monthAnimation]);

  const handleDateClick = (date: Date) => {
    const dateKey = formatLocalDateKey(date);
    const dateData = availableDatesMap.get(dateKey);
    if (
      dateData &&
      !dateData.isBlackedOut &&
      dateData.slots.length > 0 &&
      !isBefore(date, startOfDay(new Date()))
    ) {
      setSelectedDate(date);
    }
  };

  const getDayStatus = (date: Date) => {
    const dateKey = formatLocalDateKey(date);
    const dateData = availableDatesMap.get(dateKey);

    if (!dateData || dateData.isBlackedOut || dateData.slots.length === 0) {
      return "unavailable";
    }

    // Check if any slot has availability
    const hasAvailability = dateData.slots.some((slot) => slot.available);

    if (!hasAvailability) {
      return "sold-out";
    }

    // Check capacity across all slots
    const totalSpots = dateData.slots.reduce((sum, slot) => sum + slot.maxCapacity, 0);
    const bookedSpots = dateData.slots.reduce((sum, slot) => sum + slot.bookedCount, 0);
    const availabilityRate = (totalSpots - bookedSpots) / totalSpots;

    if (availabilityRate < 0.2) {
      return "low";
    }

    return "available";
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h4 className="font-medium">{format(currentMonth, "MMMM yyyy")}</h4>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div
        className={`transition-transform duration-200 ${
          monthAnimation === "slide-left"
            ? "-translate-x-1"
            : monthAnimation === "slide-right"
            ? "translate-x-1"
            : "translate-x-0"
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {Array.from({ length: startDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {/* Days */}
        {daysInMonth.map((day) => {
          const status = getDayStatus(day);
          const isPast = isBefore(day, startOfDay(new Date()));
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={formatLocalDateKey(day)}
              onClick={() => handleDateClick(day)}
              disabled={status === "unavailable" || isPast}
              className={`
                aspect-square flex items-center justify-center text-sm rounded-md
                transition-colors relative
                ${isPast ? "text-muted-foreground/50 cursor-not-allowed" : ""}
                ${status === "unavailable" && !isPast ? "text-muted-foreground cursor-not-allowed" : ""}
                ${status === "available" && !isPast ? "hover:bg-primary/10 cursor-pointer" : ""}
                ${status === "low" && !isPast ? "hover:bg-orange-100 cursor-pointer" : ""}
                ${status === "sold-out" && !isPast ? "text-muted-foreground cursor-not-allowed" : ""}
                ${isSelected ? "bg-primary text-primary-foreground" : ""}
                ${isTodayDate && !isSelected ? "ring-1 ring-primary" : ""}
              `}
            >
              {format(day, "d")}
              {/* Availability indicator */}
              {!isPast && status !== "unavailable" && (
                <span
                  className={`
                    absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full
                    ${status === "available" ? "bg-green-500" : ""}
                    ${status === "low" ? "bg-orange-500" : ""}
                    ${status === "sold-out" ? "bg-red-500" : ""}
                    ${isSelected ? "bg-primary-foreground" : ""}
                  `}
                />
              )}
            </button>
          );
        })}
      </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Limited</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>Sold Out</span>
        </div>
      </div>

      {loadingMonthKey === currentMonthKey && (
        <p className="text-xs text-muted-foreground">Loading availability...</p>
      )}

      {monthLoadError && (
        <p className="text-xs text-red-600">{monthLoadError}</p>
      )}

      {/* Selected Date Slots */}
      {selectedDate && (
        <div className="pt-4 border-t space-y-3">
          <h4 className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</h4>
          {selectedDateSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No availability on this date.</p>
          ) : (
            <div className="space-y-2">
              {selectedDateSlots.map((slot) => {
                const isFull = !slot.available;
                const slotLabel = slot.almostFull
                  ? "Popular"
                  : slot.spotsRemaining >= Math.max(6, slot.maxCapacity * 0.6)
                  ? "Best availability"
                  : null;

                return (
                  <div
                    key={slot.time}
                    className={`
                      p-3 rounded-md border
                      ${isFull ? "bg-muted/50 opacity-70" : "hover:border-primary"}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatTime(slot.time)}</span>
                        {slot.label && (
                          <span className="text-xs text-muted-foreground">({slot.label})</span>
                        )}
                        {slotLabel && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {slotLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {isFull ? (
                            <span className="text-red-500">Sold Out</span>
                          ) : slot.almostFull ? (
                            <span className="text-orange-500">
                              Only {slot.spotsRemaining} spot
                              {slot.spotsRemaining !== 1 ? "s" : ""} left!
                            </span>
                          ) : (
                            `${slot.spotsRemaining} spots available`
                          )}
                        </span>
                      </div>
                      {!isFull && (
                        <Button size="sm" asChild>
                          <a
                            href={`/org/${organizationSlug}/tours/${tourSlug}/book?date=${formatLocalDateKey(selectedDate)}&time=${encodeURIComponent(slot.time)}`}
                          >
                            Book Now
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* No availability message */}
      {!selectedDate && loadedDateCount === 0 && loadingMonthKey !== currentMonthKey && (
        <div className="text-center py-6 text-muted-foreground">
          <p>No upcoming availability.</p>
          <p className="text-sm">Check back later for new dates.</p>
        </div>
      )}
    </div>
  );
}
