"use client";

import { cn } from "@/lib/utils";
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";

interface DayHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE");
}

export function DayHeader({ selectedDate, onDateChange, className }: DayHeaderProps) {
  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1));
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1));
  const handleToday = () => onDateChange(new Date());

  const dateLabel = getDateLabel(selectedDate);
  const isCurrentDay = isToday(selectedDate);

  // Handle native date input change
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      // Parse YYYY-MM-DD format
      const parts = value.split("-").map(Number);
      if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
        const [year, month, day] = parts as [number, number, number];
        const newDate = new Date(year, month - 1, day);
        onDateChange(newDate);
      }
    }
  };

  return (
    <header className={cn("flex items-center justify-between", className)}>
      {/* Date Navigation */}
      <div className="flex items-center gap-3">
        {/* Prev/Next buttons */}
        <div className="flex items-center">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Previous day"
            onClick={handlePrevDay}
            className="rounded-r-none border-r-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Next day"
            onClick={handleNextDay}
            className="rounded-l-none"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Date Display with native date picker */}
        <div className="relative">
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
              "hover:bg-muted/60 active:bg-muted",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            onClick={() => {
              // Click the hidden date input
              const input = document.getElementById("date-picker-input") as HTMLInputElement;
              input?.showPicker?.();
            }}
          >
            <div className="text-left">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-xl font-bold tracking-tight",
                    isCurrentDay ? "text-primary" : "text-foreground"
                  )}
                >
                  {dateLabel}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {format(selectedDate, "MMM d, yyyy")}
                </span>
              </div>
            </div>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Hidden date input for native picker */}
          <input
            id="date-picker-input"
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={handleDateInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ position: "absolute", top: 0, left: 0 }}
          />
        </div>

        {/* Today button - only show if not on today */}
        {!isCurrentDay && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs font-medium"
          >
            Today
          </Button>
        )}
      </div>
    </header>
  );
}
