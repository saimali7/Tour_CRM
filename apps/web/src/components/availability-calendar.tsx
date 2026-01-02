"use client";

import { useState, useMemo } from "react";
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
}

function formatTime(time: string): string {
  // time is in HH:MM format
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours!, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function AvailabilityCalendar({
  availableDates,
  currency,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Create a map of available dates for quick lookup
  const availableDatesMap = useMemo(() => {
    const map = new Map<string, AvailableDate>();
    availableDates.forEach((ad) => {
      map.set(ad.date, ad);
    });
    return map;
  }, [availableDates]);

  // Get all days in the current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week the month starts on (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();

  // Slots for selected date
  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const dateData = availableDatesMap.get(dateKey);
    return dateData?.slots ?? [];
  }, [selectedDate, availableDatesMap]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dateData = availableDatesMap.get(dateKey);
    if (dateData && !dateData.isBlackedOut && dateData.slots.length > 0 && !isBefore(date, startOfDay(new Date()))) {
      setSelectedDate(date);
    }
  };

  const getDayStatus = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dateData = availableDatesMap.get(dateKey);

    if (!dateData || dateData.isBlackedOut || dateData.slots.length === 0) {
      return "unavailable";
    }

    // Check if any slot has availability
    const hasAvailability = dateData.slots.some((s) => s.available);

    if (!hasAvailability) {
      return "sold-out";
    }

    // Check capacity across all slots
    const totalSpots = dateData.slots.reduce((sum, s) => sum + s.maxCapacity, 0);
    const bookedSpots = dateData.slots.reduce((sum, s) => sum + s.bookedCount, 0);
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
              key={day.toISOString()}
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

      {/* Selected Date Slots */}
      {selectedDate && (
        <div className="pt-4 border-t space-y-3">
          <h4 className="font-medium">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h4>
          {selectedDateSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No availability on this date.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDateSlots.map((slot) => {
                const isFull = !slot.available;

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
                        <span className="font-medium">
                          {formatTime(slot.time)}
                        </span>
                        {slot.label && (
                          <span className="text-xs text-muted-foreground">
                            ({slot.label})
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
                          <a href={`book?date=${format(selectedDate, "yyyy-MM-dd")}&time=${slot.time}`}>
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
      {!selectedDate && availableDates.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p>No upcoming availability.</p>
          <p className="text-sm">Check back later for new dates.</p>
        </div>
      )}
    </div>
  );
}
