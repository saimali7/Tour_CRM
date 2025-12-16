"use client";

import { useState, useMemo } from "react";
import { Plus, X, Calendar, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ScheduleTemplate {
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  times: string[];
  maxParticipants?: number;
}

interface TimeSlot {
  id: string;
  time: string;
}

interface ScheduleTemplateFormProps {
  durationMinutes: number;
  defaultMaxParticipants: number;
  onSubmit: (template: ScheduleTemplate) => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleTemplateForm({
  durationMinutes,
  defaultMaxParticipants,
  onSubmit,
  onSkip,
  isSubmitting = false,
}: ScheduleTemplateFormProps) {
  // Default to Mon-Fri
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: "1", time: "09:00" },
  ]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0] || "");
  // Default end date to 3 months from now
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0] || "";
  });
  const [maxParticipants, setMaxParticipants] = useState(defaultMaxParticipants);

  // Calculate end time based on duration
  const calculateEndTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
    const endMinutes = startMinutes + durationMinutes;
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
    if (!startDate || !endDate || selectedDays.length === 0 || timeSlots.length === 0) return [];

    const schedules: { date: Date; time: string }[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end && schedules.length < 500) {
      const dayOfWeek = current.getDay();
      if (selectedDays.includes(dayOfWeek)) {
        for (const slot of timeSlots) {
          schedules.push({
            date: new Date(current),
            time: slot.time,
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return schedules;
  }, [startDate, endDate, selectedDays, timeSlots]);

  // Toggle day selection
  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // Add time slot
  const addTimeSlot = () => {
    const lastSlot = timeSlots[timeSlots.length - 1];
    const [hours] = (lastSlot?.time || "09:00").split(":").map(Number);
    const newHours = ((hours ?? 9) + 3) % 24;
    setTimeSlots([
      ...timeSlots,
      { id: Date.now().toString(), time: `${String(newHours).padStart(2, "0")}:00` },
    ]);
  };

  // Remove time slot
  const removeTimeSlot = (id: string) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((slot) => slot.id !== id));
    }
  };

  // Update time slot
  const updateTimeSlot = (id: string, time: string) => {
    setTimeSlots(timeSlots.map((slot) => (slot.id === id ? { ...slot, time } : slot)));
  };

  // Handle submit
  const handleSubmit = () => {
    if (generatedSchedules.length === 0) return;

    onSubmit({
      startDate,
      endDate,
      daysOfWeek: selectedDays,
      times: timeSlots.map((s) => s.time),
      maxParticipants,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-medium text-foreground">Set Up Initial Schedule</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Define when your tour runs. You can always add more schedules later.
            </p>
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Date Range
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Days of Week */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">Days of Week</label>
        <div className="flex gap-2">
          {DAY_NAMES.map((day, index) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(index)}
              className={cn(
                "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                selectedDays.includes(index)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Start Times
          </label>
          <button
            type="button"
            onClick={addTimeSlot}
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Time
          </button>
        </div>
        <div className="space-y-2">
          {timeSlots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-3">
              <input
                type="time"
                value={slot.time}
                onChange={(e) => updateTimeSlot(slot.id, e.target.value)}
                className="px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              />
              <span className="text-sm text-muted-foreground">
                ends {calculateEndTime(slot.time)} ({formatDuration(durationMinutes)})
              </span>
              {timeSlots.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTimeSlot(slot.id)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Capacity */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Max Participants per Session
        </label>
        <input
          type="number"
          min="1"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(parseInt(e.target.value) || defaultMaxParticipants)}
          className="w-32 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
        />
      </div>

      {/* Preview */}
      {generatedSchedules.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Preview</span>
            <span className="text-xs text-muted-foreground">
              {generatedSchedules.length} schedule{generatedSchedules.length !== 1 ? "s" : ""} will be created
            </span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {generatedSchedules.slice(0, 12).map((schedule, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-1 bg-background rounded text-xs text-muted-foreground border border-border"
              >
                {schedule.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                {" "}
                {schedule.time}
              </span>
            ))}
            {generatedSchedules.length > 12 && (
              <span className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground">
                +{generatedSchedules.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={onSkip}
          disabled={isSubmitting}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || generatedSchedules.length === 0}
        >
          {isSubmitting ? "Creating..." : `Create ${generatedSchedules.length} Schedule${generatedSchedules.length !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
