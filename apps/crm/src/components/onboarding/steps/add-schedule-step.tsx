"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField } from "@/components/ui/label";
import { useOnboarding } from "@/providers/onboarding-provider";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format, addDays, addWeeks } from "date-fns";
import {
  Calendar,
  Clock,
  Plus,
  X,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface AddScheduleStepProps {
  onComplete: () => void;
  onSkipStep: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const daysOfWeek = [
  { value: 0, label: "Sun", fullLabel: "Sunday" },
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
];

const commonTimes = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

// =============================================================================
// COMPONENT
// =============================================================================

export function AddScheduleStep({
  onComplete,
  onSkipStep,
}: AddScheduleStepProps) {
  const { setStepData, state } = useOnboarding();

  // Get the tour ID from previous step
  const tourId = state.data.firstTour?.id;

  // Initialize form state
  const [selectedDays, setSelectedDays] = useState<number[]>(
    state.data.schedule?.daysOfWeek ?? [1, 2, 3, 4, 5] // Default: weekdays
  );
  const [times, setTimes] = useState<string[]>(
    state.data.schedule?.times ?? ["10:00"]
  );
  const [newTime, setNewTime] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Date range: starting tomorrow, for 4 weeks
  const startDate = addDays(new Date(), 1);
  const endDate = addWeeks(startDate, 4);

  // Auto-generate schedules mutation
  const generateSchedules = trpc.schedule.autoGenerate.useMutation({
    onSuccess: (result) => {
      toast.success(`Created ${result.created} time slots`);
      setStepData("schedule", {
        tourId: tourId!,
        daysOfWeek: selectedDays,
        times,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      onComplete();
    },
    onError: (error) => {
      toast.error("Failed to create schedule");
      setErrors({ submit: error.message });
    },
  });

  // Toggle day selection
  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b)
    );
  };

  // Add a new time slot
  const addTime = (time: string) => {
    if (!time) return;

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setErrors({ time: "Please use HH:MM format" });
      return;
    }

    // Check for duplicates
    if (times.includes(time)) {
      setErrors({ time: "This time is already added" });
      return;
    }

    setTimes((prev) => [...prev, time].sort());
    setNewTime("");
    setErrors({});
  };

  // Remove a time slot
  const removeTime = (time: string) => {
    setTimes((prev) => prev.filter((t) => t !== time));
  };

  // Calculate schedule preview
  const schedulePreview = useMemo(() => {
    if (selectedDays.length === 0 || times.length === 0) {
      return { totalSlots: 0, slotsPerWeek: 0 };
    }

    const slotsPerWeek = selectedDays.length * times.length;
    const totalSlots = slotsPerWeek * 4; // 4 weeks

    return { totalSlots, slotsPerWeek };
  }, [selectedDays, times]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tourId) {
      toast.error("Please create a tour first");
      return;
    }

    if (selectedDays.length === 0) {
      setErrors({ days: "Please select at least one day" });
      return;
    }

    if (times.length === 0) {
      setErrors({ times: "Please add at least one time slot" });
      return;
    }

    // Generate schedules
    await generateSchedules.mutateAsync({
      tourId,
      startDate,
      endDate,
      daysOfWeek: selectedDays,
      times,
      skipExisting: true,
    });
  };

  // Check if we can proceed
  const canProceed = selectedDays.length > 0 && times.length > 0 && tourId;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Friendly intro */}
      <div className="text-center pb-2">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
          <Calendar className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Set when your tour is available. We'll create time slots for the next
          4 weeks automatically.
        </p>
      </div>

      {/* Tour reference */}
      {state.data.firstTour?.name && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Scheduling for
          </p>
          <p className="text-sm font-medium text-foreground">
            {state.data.firstTour.name}
          </p>
        </div>
      )}

      {/* Days of week selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Available Days
          {errors.days && (
            <span className="text-destructive ml-2 font-normal">
              {errors.days}
            </span>
          )}
        </Label>
        <div className="flex flex-wrap gap-2">
          {daysOfWeek.map((day) => {
            const isSelected = selectedDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "h-14 w-14 rounded-xl border-2 transition-all duration-150",
                  "text-sm font-medium",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <span className="text-xs opacity-70">{day.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 mt-0.5" />}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedDays.length === 0
            ? "Click to select available days"
            : `${selectedDays.length} day${selectedDays.length !== 1 ? "s" : ""} selected`}
        </p>
      </div>

      {/* Time slots */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Start Times
          {errors.times && (
            <span className="text-destructive ml-2 font-normal">
              {errors.times}
            </span>
          )}
        </Label>

        {/* Current times */}
        <div className="flex flex-wrap gap-2">
          {times.map((time) => (
            <div
              key={time}
              className={cn(
                "inline-flex items-center gap-2",
                "px-3 py-1.5 rounded-lg",
                "bg-primary/10 text-primary border border-primary/20",
                "text-sm font-medium"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {time}
              <button
                type="button"
                onClick={() => removeTime(time)}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Add time input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={newTime}
              onChange={(e) => {
                setNewTime(e.target.value);
                if (errors.time) setErrors({});
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTime(newTime);
                }
              }}
              className="pl-10"
              placeholder="Add time"
              error={!!errors.time}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => addTime(newTime)}
            disabled={!newTime}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {errors.time && (
          <p className="text-xs text-destructive">{errors.time}</p>
        )}

        {/* Quick add common times */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Quick add:</p>
          <div className="flex flex-wrap gap-1.5">
            {commonTimes
              .filter((t) => !times.includes(t))
              .slice(0, 6)
              .map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => addTime(time)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium",
                    "border border-border bg-card",
                    "hover:border-primary/50 hover:bg-muted/50",
                    "transition-colors"
                  )}
                >
                  {time}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Schedule preview */}
      {schedulePreview.totalSlots > 0 && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                {schedulePreview.totalSlots} time slots will be created
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {schedulePreview.slotsPerWeek} per week for the next 4 weeks
                (starting {format(startDate, "MMM d")})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {errors.submit && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{errors.submit}</p>
        </div>
      )}

      {/* Submit button */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={generateSchedules.isPending || !canProceed}
          className="w-full h-11 gap-2 font-medium"
        >
          {generateSchedules.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating schedule...
            </>
          ) : (
            <>
              Create Schedule & Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
