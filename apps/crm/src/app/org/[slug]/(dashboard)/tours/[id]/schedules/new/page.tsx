"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

const DAY_NAMES = [
  { short: "S", full: "Sun", index: 0 },
  { short: "M", full: "Mon", index: 1 },
  { short: "T", full: "Tue", index: 2 },
  { short: "W", full: "Wed", index: 3 },
  { short: "T", full: "Thu", index: 4 },
  { short: "F", full: "Fri", index: 5 },
  { short: "S", full: "Sat", index: 6 },
];

export default function AddSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const tourId = params.id as string;

  // Fetch tour data
  const { data: tour, isLoading: tourLoading } = trpc.tour.getById.useQuery({ id: tourId });

  // Form state
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0] || "");
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0] || "";
  });
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null);

  const autoGenerateMutation = trpc.schedule.autoGenerate.useMutation();

  // Calculate end time based on duration
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
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

  // Generate preview
  const generatedSchedules = useMemo(() => {
    if (!startDate || !endDate || selectedDays.length === 0 || times.length === 0) {
      return [];
    }

    const schedules: { date: Date; time: string }[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end && schedules.length < 500) {
      const dayOfWeek = current.getDay();
      if (selectedDays.includes(dayOfWeek)) {
        for (const time of times) {
          schedules.push({
            date: new Date(current),
            time,
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return schedules;
  }, [startDate, endDate, selectedDays, times]);

  // Toggle day
  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  // Add time slot
  const addTimeSlot = () => {
    const lastTime = times[times.length - 1] || "09:00";
    const [hours] = lastTime.split(":").map(Number);
    const newHours = ((hours ?? 9) + 3) % 24;
    setTimes([...times, `${String(newHours).padStart(2, "0")}:00`]);
  };

  // Remove time slot
  const removeTimeSlot = (index: number) => {
    if (times.length > 1) {
      setTimes(times.filter((_, i) => i !== index));
    }
  };

  // Update time slot
  const updateTimeSlot = (index: number, time: string) => {
    const newTimes = [...times];
    newTimes[index] = time;
    setTimes(newTimes);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (generatedSchedules.length === 0) return;

    try {
      const result = await autoGenerateMutation.mutateAsync({
        tourId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        daysOfWeek: selectedDays,
        times,
        maxParticipants: maxParticipants ?? tour?.maxParticipants ?? 10,
        skipExisting: true,
      });

      toast.success(`Created ${result.created.length} schedules`);
      router.push(`/org/${slug}/tours/${tourId}?tab=schedules`);
    } catch (error) {
      toast.error("Failed to create schedules");
    }
  };

  if (tourLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="p-6">
        <p className="text-destructive">Tour not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/tours/${tourId}?tab=schedules` as Route}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Add Schedules</h1>
            <p className="text-muted-foreground">{tour.name}</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={autoGenerateMutation.isPending || generatedSchedules.length === 0}
          className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {autoGenerateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create {generatedSchedules.length} Schedule{generatedSchedules.length !== 1 ? "s" : ""}
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 space-y-8">
        {/* Info Banner */}
        <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Bulk Schedule Generator</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create recurring schedules for {tour.name}. Duration: {formatDuration(tour.durationMinutes)}
            </p>
          </div>
        </div>

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
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
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
                  selectedDays.includes(day.index)
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
            {selectedDays.length === 0
              ? "Select at least one day"
              : `Running on ${selectedDays.length} day${selectedDays.length > 1 ? "s" : ""} per week`}
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
            {times.map((time, index) => (
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
                    {calculateEndTime(time, tour.durationMinutes)}
                  </span>
                  <span className="px-2 py-0.5 bg-muted rounded text-xs">
                    {formatDuration(tour.durationMinutes)}
                  </span>
                </div>
                {times.length > 1 && (
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

        {/* Capacity Override */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">
            Capacity per Session
            <span className="text-muted-foreground font-normal ml-2">
              (default: {tour.maxParticipants})
            </span>
          </h3>
          <input
            type="number"
            min={1}
            placeholder={String(tour.maxParticipants)}
            value={maxParticipants ?? ""}
            onChange={(e) => setMaxParticipants(e.target.value ? parseInt(e.target.value) : null)}
            className={cn(
              "w-32 px-4 py-2 border rounded-lg transition-all",
              "bg-background text-foreground",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary border-input"
            )}
          />
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
      </div>
    </div>
  );
}
