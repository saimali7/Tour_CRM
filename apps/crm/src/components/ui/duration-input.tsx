"use client";

import { useState, useCallback, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DurationInputProps {
  /** Duration value in minutes */
  value: number;
  /** Called when duration changes (in minutes) */
  onChange: (minutes: number) => void;
  /** Minimum duration in minutes (default: 15) */
  min?: number;
  /** Maximum duration in minutes (default: 1440 = 24 hours) */
  max?: number;
  /** Additional class names */
  className?: string;
  /** ID for the input */
  id?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Duration input component that allows entering hours and minutes
 * Internally stores/returns value in minutes for consistency with the database
 */
export function DurationInput({
  value,
  onChange,
  min = 15,
  max = 1440,
  className,
  id,
  disabled = false,
}: DurationInputProps) {
  // Convert total minutes to hours and minutes
  const hoursFromValue = Math.floor(value / 60);
  const minutesFromValue = value % 60;

  const [hours, setHours] = useState(hoursFromValue);
  const [minutes, setMinutes] = useState(minutesFromValue);
  const [isFocused, setIsFocused] = useState(false);

  // Sync internal state when value prop changes externally
  useEffect(() => {
    const newHours = Math.floor(value / 60);
    const newMinutes = value % 60;
    if (newHours !== hours || newMinutes !== minutes) {
      setHours(newHours);
      setMinutes(newMinutes);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDuration = useCallback(
    (newHours: number, newMinutes: number) => {
      // Clamp values
      const clampedHours = Math.max(0, Math.min(23, newHours));
      const clampedMinutes = Math.max(0, Math.min(59, newMinutes));

      // Calculate total minutes
      let totalMinutes = clampedHours * 60 + clampedMinutes;

      // Apply min/max constraints
      totalMinutes = Math.max(min, Math.min(max, totalMinutes));

      // Recalculate hours/minutes from constrained total
      const finalHours = Math.floor(totalMinutes / 60);
      const finalMinutes = totalMinutes % 60;

      setHours(finalHours);
      setMinutes(finalMinutes);
      onChange(totalMinutes);
    },
    [min, max, onChange]
  );

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = parseInt(e.target.value) || 0;
    updateDuration(newHours, minutes);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = parseInt(e.target.value) || 0;
    updateDuration(hours, newMinutes);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Icon - positioned to match other form inputs */}
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Clock className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Input container - styled to match form inputs in tour creation */}
      <div
        className={cn(
          "flex items-center border rounded-xl transition-all",
          "bg-background pl-11 pr-4 py-3",
          isFocused
            ? "ring-2 ring-primary/30 focus:ring-offset-0 border-primary"
            : "border-input",
          disabled && "opacity-50 cursor-not-allowed bg-muted"
        )}
      >
        {/* Hours input */}
        <input
          type="number"
          id={id}
          value={hours}
          onChange={handleHoursChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          min={0}
          max={23}
          disabled={disabled}
          className={cn(
            "w-10 text-center text-lg font-medium bg-transparent border-0 p-0",
            "text-foreground",
            "focus:outline-none focus:ring-0",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            disabled && "cursor-not-allowed"
          )}
          aria-label="Hours"
        />
        <span className="text-sm text-muted-foreground font-medium">h</span>

        <span className="text-muted-foreground mx-2">:</span>

        {/* Minutes input */}
        <input
          type="number"
          value={minutes}
          onChange={handleMinutesChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          min={0}
          max={59}
          step={15}
          disabled={disabled}
          className={cn(
            "w-10 text-center text-lg font-medium bg-transparent border-0 p-0",
            "text-foreground",
            "focus:outline-none focus:ring-0",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            disabled && "cursor-not-allowed"
          )}
          aria-label="Minutes"
        />
        <span className="text-sm text-muted-foreground font-medium">m</span>
      </div>
    </div>
  );
}

/**
 * Simple duration display (read-only)
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  }
  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${hours}h ${mins}m`;
}
