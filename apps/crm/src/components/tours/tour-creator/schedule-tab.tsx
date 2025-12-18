"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Plus, X, CalendarDays, Sparkles } from "lucide-react";
import type { TourFormState } from "../tour-creator";

interface ScheduleTabProps {
  formState: TourFormState;
  updateForm: (updates: Partial<TourFormState>) => void;
}

const DAY_NAMES = [
  { short: "S", full: "Sun", index: 0 },
  { short: "M", full: "Mon", index: 1 },
  { short: "T", full: "Tue", index: 2 },
  { short: "W", full: "Wed", index: 3 },
  { short: "T", full: "Thu", index: 4 },
  { short: "F", full: "Fri", index: 5 },
  { short: "S", full: "Sat", index: 6 },
];

export function ScheduleTab({ formState, updateForm }: ScheduleTabProps) {
  // Calculate end time based on duration
  const calculateEndTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
    const endMinutes = startMinutes + formState.durationMinutes;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  // Generate preview of schedules
  const generatedSchedules = useMemo(() => {
    if (
      !formState.scheduleEnabled ||
      !formState.scheduleStartDate ||
      !formState.scheduleEndDate ||
      formState.scheduleDays.length === 0 ||
      formState.scheduleTimes.length === 0
    ) {
      return [];
    }

    const schedules: { date: Date; time: string }[] = [];
    const start = new Date(formState.scheduleStartDate);
    const end = new Date(formState.scheduleEndDate);
    const current = new Date(start);

    while (current <= end && schedules.length < 500) {
      const dayOfWeek = current.getDay();
      if (formState.scheduleDays.includes(dayOfWeek)) {
        for (const time of formState.scheduleTimes) {
          schedules.push({
            date: new Date(current),
            time,
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return schedules;
  }, [formState.scheduleEnabled, formState.scheduleStartDate, formState.scheduleEndDate, formState.scheduleDays, formState.scheduleTimes]);

  // Toggle day
  const toggleDay = (dayIndex: number) => {
    const newDays = formState.scheduleDays.includes(dayIndex)
      ? formState.scheduleDays.filter((d) => d !== dayIndex)
      : [...formState.scheduleDays, dayIndex].sort();
    updateForm({ scheduleDays: newDays });
  };

  // Add time slot
  const addTimeSlot = () => {
    const lastTime = formState.scheduleTimes[formState.scheduleTimes.length - 1] || "09:00";
    const [hours] = lastTime.split(":").map(Number);
    const newHours = ((hours ?? 9) + 3) % 24;
    updateForm({
      scheduleTimes: [...formState.scheduleTimes, `${String(newHours).padStart(2, "0")}:00`],
    });
  };

  // Remove time slot
  const removeTimeSlot = (index: number) => {
    if (formState.scheduleTimes.length > 1) {
      updateForm({
        scheduleTimes: formState.scheduleTimes.filter((_, i) => i !== index),
      });
    }
  };

  // Update time slot
  const updateTimeSlot = (index: number, time: string) => {
    const newTimes = [...formState.scheduleTimes];
    newTimes[index] = time;
    updateForm({ scheduleTimes: newTimes });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-violet-500/5 rounded-xl border border-violet-500/10">
        <div className="p-2 bg-violet-500/10 rounded-lg">
          <Calendar className="h-5 w-5 text-violet-500" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Schedule Setup</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define when your tour runs. You can always add more schedules later.
          </p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Set up initial schedule</p>
            <p className="text-sm text-muted-foreground">
              Create recurring schedules for your tour
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateForm({ scheduleEnabled: !formState.scheduleEnabled })}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            formState.scheduleEnabled ? "bg-primary" : "bg-muted-foreground/30"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              formState.scheduleEnabled ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {formState.scheduleEnabled && (
        <>
          {/* Date Range */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date Range
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs text-muted-foreground">Start Date</label>
                <input
                  type="date"
                  value={formState.scheduleStartDate}
                  onChange={(e) => updateForm({ scheduleStartDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  className={cn(
                    "w-full px-4 py-3 border rounded-xl transition-all",
                    "bg-background text-foreground",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-muted-foreground">End Date</label>
                <input
                  type="date"
                  value={formState.scheduleEndDate}
                  onChange={(e) => updateForm({ scheduleEndDate: e.target.value })}
                  min={formState.scheduleStartDate}
                  className={cn(
                    "w-full px-4 py-3 border rounded-xl transition-all",
                    "bg-background text-foreground",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Days of Week */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Days of Week</h3>
            <div className="flex gap-2">
              {DAY_NAMES.map((day) => (
                <button
                  key={day.index}
                  type="button"
                  onClick={() => toggleDay(day.index)}
                  className={cn(
                    "w-12 h-12 rounded-xl text-sm font-medium transition-all",
                    "flex flex-col items-center justify-center gap-0.5",
                    formState.scheduleDays.includes(day.index)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span className="text-xs opacity-70">{day.short}</span>
                  <span>{day.full}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {formState.scheduleDays.length === 0
                ? "Select at least one day"
                : `Running on ${formState.scheduleDays.length} day${formState.scheduleDays.length > 1 ? "s" : ""} per week`}
            </p>
          </div>

          {/* Time Slots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Start Times
              </h3>
              <button
                type="button"
                onClick={addTimeSlot}
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Time
              </button>
            </div>
            <div className="space-y-3">
              {formState.scheduleTimes.map((time, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl"
                >
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateTimeSlot(index, e.target.value)}
                    className={cn(
                      "px-4 py-2 border rounded-lg transition-all",
                      "bg-background text-foreground font-medium",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
                    )}
                  />
                  <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>ends</span>
                    <span className="font-medium text-foreground">
                      {calculateEndTime(time)}
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded text-xs">
                      {formatDuration(formState.durationMinutes)}
                    </span>
                  </div>
                  {formState.scheduleTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(index)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {generatedSchedules.length > 0 && (
            <div className="space-y-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-foreground">Preview</span>
                </div>
                <span className="text-sm font-medium text-emerald-600">
                  {generatedSchedules.length} schedule{generatedSchedules.length !== 1 ? "s" : ""} will be created
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {generatedSchedules.slice(0, 20).map((schedule, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1.5 bg-background rounded-lg text-xs text-foreground border border-border"
                  >
                    {schedule.date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    @ {schedule.time}
                  </span>
                ))}
                {generatedSchedules.length > 20 && (
                  <span className="inline-flex items-center px-3 py-1.5 text-xs text-muted-foreground">
                    +{generatedSchedules.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!formState.scheduleEnabled && (
        <div className="p-6 bg-muted/30 rounded-xl border border-dashed border-border text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            You can set up schedules later from the tour detail page
          </p>
        </div>
      )}
    </div>
  );
}
