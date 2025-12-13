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
import type { Schedule } from "@tour/database";

interface AvailabilityCalendarProps {
  schedules: Schedule[];
  currency: string;
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "h:mm a");
}

function formatPrice(price: string | number | null, currency: string): string {
  if (!price) return "";
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericPrice);
}

export function AvailabilityCalendar({
  schedules,
  currency,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    schedules.forEach((schedule) => {
      const dateKey = format(new Date(schedule.startsAt), "yyyy-MM-dd");
      const existing = map.get(dateKey) || [];
      existing.push(schedule);
      map.set(dateKey, existing);
    });
    return map;
  }, [schedules]);

  // Get all days in the current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week the month starts on (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();

  // Schedules for selected date
  const selectedDateSchedules = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return schedulesByDate.get(dateKey) || [];
  }, [selectedDate, schedulesByDate]);

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
    const hasSchedules = schedulesByDate.has(dateKey);
    if (hasSchedules && !isBefore(date, startOfDay(new Date()))) {
      setSelectedDate(date);
    }
  };

  const getDayStatus = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const daySchedules = schedulesByDate.get(dateKey);

    if (!daySchedules || daySchedules.length === 0) {
      return "unavailable";
    }

    // Check if any schedule has availability
    const hasAvailability = daySchedules.some(
      (s) => (s.bookedCount || 0) < s.maxParticipants
    );

    if (!hasAvailability) {
      return "sold-out";
    }

    // Check capacity
    const totalSpots = daySchedules.reduce(
      (sum, s) => sum + s.maxParticipants,
      0
    );
    const bookedSpots = daySchedules.reduce(
      (sum, s) => sum + (s.bookedCount || 0),
      0
    );
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

      {/* Selected Date Schedules */}
      {selectedDate && (
        <div className="pt-4 border-t space-y-3">
          <h4 className="font-medium">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h4>
          {selectedDateSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No availability on this date.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDateSchedules.map((schedule) => {
                const spotsRemaining =
                  schedule.maxParticipants - (schedule.bookedCount || 0);
                const isFull = spotsRemaining <= 0;

                return (
                  <div
                    key={schedule.id}
                    className={`
                      p-3 rounded-md border
                      ${isFull ? "bg-muted/50 opacity-70" : "hover:border-primary"}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatTime(schedule.startsAt)}
                        </span>
                      </div>
                      {schedule.price && (
                        <span className="font-semibold">
                          {formatPrice(schedule.price, currency)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {isFull ? (
                            <span className="text-red-500">Sold Out</span>
                          ) : spotsRemaining <= 3 ? (
                            <span className="text-orange-500">
                              Only {spotsRemaining} spot
                              {spotsRemaining !== 1 ? "s" : ""} left!
                            </span>
                          ) : (
                            `${spotsRemaining} spots available`
                          )}
                        </span>
                      </div>
                      {!isFull && (
                        <Button size="sm" disabled>
                          Select
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
      {!selectedDate && schedules.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p>No upcoming availability.</p>
          <p className="text-sm">Check back later for new dates.</p>
        </div>
      )}
    </div>
  );
}
