"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Plus,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Edit,
  Trash2,
  CalendarPlus,
  Repeat,
  X,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TourScheduleManagerProps {
  tourId: string;
  orgSlug: string;
  tourDefaults: {
    durationMinutes: number;
    maxParticipants: number;
    meetingPoint?: string | null;
    meetingPointDetails?: string | null;
  };
}

interface TimeSlot {
  id: string;
  time: string;
}

type CreateMode = "single" | "recurring";
type ViewFilter = "upcoming" | "past" | "all";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TourScheduleManager({ tourId, orgSlug, tourDefaults }: TourScheduleManagerProps) {
  const [viewFilter, setViewFilter] = useState<ViewFilter>("upcoming");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("recurring");
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Single schedule form
  const [singleDate, setSingleDate] = useState("");
  const [singleTime, setSingleTime] = useState("09:00");
  const [singleCapacity, setSingleCapacity] = useState(tourDefaults.maxParticipants);

  // Recurring schedule form
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
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
  const [recurringCapacity, setRecurringCapacity] = useState(tourDefaults.maxParticipants);

  const utils = trpc.useUtils();

  // Fetch all schedules for this tour
  const { data: schedulesData, isLoading } = trpc.schedule.list.useQuery({
    filters: { tourId },
    pagination: { limit: 100 },
    sort: { field: "startsAt", direction: viewFilter === "past" ? "desc" : "asc" },
  });

  // Create schedule mutation
  const createMutation = trpc.schedule.create.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create schedule");
    },
  });

  // Delete schedule mutation
  const deleteMutation = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      setDeletingScheduleId(null);
      toast.success("Schedule deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete schedule");
    },
  });

  // Filter schedules based on view
  const filteredSchedules = useMemo(() => {
    if (!schedulesData?.data) return [];
    const now = new Date();

    return schedulesData.data.filter((schedule) => {
      const scheduleDate = new Date(schedule.startsAt);
      if (viewFilter === "upcoming") return scheduleDate >= now;
      if (viewFilter === "past") return scheduleDate < now;
      return true;
    });
  }, [schedulesData?.data, viewFilter]);

  // Calculate end time based on tour duration
  const calculateEndTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
    const endMinutes = startMinutes + tourDefaults.durationMinutes;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
  };

  // Get end date from state
  const getEndDate = (): Date => {
    return new Date(endDate);
  };

  // Generate schedule dates for preview
  const generatedSchedules = useMemo(() => {
    if (!startDate || !endDate || selectedDays.length === 0 || timeSlots.length === 0) return [];

    const schedules: { date: Date; time: string }[] = [];
    const start = new Date(startDate);
    const end = getEndDate();
    const current = new Date(start);

    while (current <= end) {
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

  // Create single schedule
  const handleCreateSingle = () => {
    if (!singleDate || !singleTime) {
      toast.error("Please select a date and time");
      return;
    }

    const startsAt = new Date(`${singleDate}T${singleTime}`);
    const endsAt = new Date(`${singleDate}T${calculateEndTime(singleTime)}`);

    createMutation.mutate(
      {
        tourId,
        startsAt,
        endsAt,
        maxParticipants: singleCapacity,
      },
      {
        onSuccess: () => {
          toast.success("Schedule created");
          setSingleDate("");
          setSingleTime("09:00");
          setShowCreateForm(false);
        },
      }
    );
  };

  // Bulk create recurring schedules
  const handleCreateRecurring = async () => {
    if (generatedSchedules.length === 0) {
      toast.error("No schedules to create. Check your settings.");
      return;
    }

    if (generatedSchedules.length > 500) {
      toast.error("Too many schedules. Please reduce the date range or time slots.");
      return;
    }

    setIsGenerating(true);
    let created = 0;
    let failed = 0;

    try {
      for (const schedule of generatedSchedules) {
        const dateStr = schedule.date.toISOString().split("T")[0];
        const startsAt = new Date(`${dateStr}T${schedule.time}`);
        const endsAt = new Date(`${dateStr}T${calculateEndTime(schedule.time)}`);

        try {
          await createMutation.mutateAsync({
            tourId,
            startsAt,
            endsAt,
            maxParticipants: recurringCapacity,
          });
          created++;
        } catch (error) {
          console.debug("Failed to create schedule:", { startsAt, tourId, error });
          failed++;
        }
      }

      if (created > 0) {
        toast.success(`Created ${created} schedules${failed > 0 ? ` (${failed} failed)` : ""}`);
        setShowCreateForm(false);
      } else {
        toast.error("Failed to create schedules");
      }
    } finally {
      setIsGenerating(false);
      utils.schedule.list.invalidate();
    }
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  // Stats
  const stats = useMemo(() => {
    const upcoming = schedulesData?.data?.filter((s) => new Date(s.startsAt) >= new Date()) || [];
    const totalCapacity = upcoming.reduce((sum, s) => sum + s.maxParticipants, 0);
    const totalBooked = upcoming.reduce((sum, s) => sum + (s.bookedCount || 0), 0);

    return { upcoming: upcoming.length, totalCapacity, totalBooked };
  }, [schedulesData?.data]);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Schedule Management</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {stats.upcoming} upcoming • {stats.totalBooked}/{stats.totalCapacity} booked
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            size="sm"
            className="gap-2"
            variant={showCreateForm ? "outline" : "default"}
          >
            {showCreateForm ? (
              <>Cancel</>
            ) : (
              <>
                <CalendarPlus className="h-4 w-4" />
                Add Schedules
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="border-b border-border">
          {/* Mode Toggle */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setCreateMode("recurring")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                createMode === "recurring"
                  ? "text-primary bg-primary/5 border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Repeat className="h-4 w-4" />
              Recurring Schedule
            </button>
            <button
              onClick={() => setCreateMode("single")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                createMode === "single"
                  ? "text-primary bg-primary/5 border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <CalendarPlus className="h-4 w-4" />
              Single Time Slot
            </button>
          </div>

          {/* Recurring Schedule Form */}
          {createMode === "recurring" && (
            <div className="p-5 space-y-5">
              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Days of Week
                </label>
                <div className="flex gap-2">
                  {DAY_NAMES.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={cn(
                        "w-12 h-10 text-sm font-medium rounded-lg transition-colors",
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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Time Slots</label>
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Time
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-1 bg-muted rounded-lg pl-1"
                    >
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateTimeSlot(slot.id, e.target.value)}
                        className="px-2 py-1.5 bg-transparent border-0 text-sm focus:ring-0"
                      />
                      {timeSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(slot.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Capacity per Slot
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={recurringCapacity}
                    onChange={(e) => setRecurringCapacity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                  />
                </div>
              </div>

              {/* Preview */}
              {generatedSchedules.length > 0 && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {generatedSchedules.length} schedules will be created
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedDays.map((d) => DAY_NAMES[d]).join(", ")} at{" "}
                        {timeSlots.map((s) => s.time).join(", ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        From {new Date(startDate).toLocaleDateString()} to{" "}
                        {getEndDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleCreateRecurring}
                  disabled={isGenerating || generatedSchedules.length === 0}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating {generatedSchedules.length} schedules...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate {generatedSchedules.length} Schedules
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Single Schedule Form */}
          {createMode === "single" && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={singleTime}
                    onChange={(e) => setSingleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={singleCapacity}
                    onChange={(e) => setSingleCapacity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                  />
                </div>
              </div>

              {/* Preview & Submit */}
              {singleDate && singleTime && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {new Date(`${singleDate}T${singleTime}`).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>{" "}
                    at {singleTime} - {calculateEndTime(singleTime)} ({formatDuration(tourDefaults.durationMinutes)})
                  </div>
                  <Button onClick={handleCreateSingle} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Schedule"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-border">
        {(["upcoming", "past", "all"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setViewFilter(filter)}
            className={cn(
              "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
              viewFilter === filter
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {filter === "upcoming" && `Upcoming (${stats.upcoming})`}
            {filter === "past" && "Past"}
            {filter === "all" && "All"}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">
              {viewFilter === "upcoming"
                ? "No upcoming schedules"
                : viewFilter === "past"
                ? "No past schedules"
                : "No schedules"}
            </p>
            {viewFilter === "upcoming" && !showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
              >
                <Plus className="h-4 w-4" />
                Create First Schedule
              </Button>
            )}
          </div>
        ) : (
          filteredSchedules.map((schedule) => {
            const isPast = new Date(schedule.startsAt) < new Date();
            const bookedCount = schedule.bookedCount || 0;
            const fillRate =
              schedule.maxParticipants > 0
                ? Math.round((bookedCount / schedule.maxParticipants) * 100)
                : 0;
            const available = schedule.maxParticipants - bookedCount;

            return (
              <div
                key={schedule.id}
                className={cn("p-4 hover:bg-muted/30 transition-colors", isPast && "opacity-60")}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Date/Time & Status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/org/${orgSlug}/availability/${schedule.id}` as Route}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {formatDateTime(schedule.startsAt)}
                      </Link>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          schedule.status === "scheduled" && "bg-info/10 text-info",
                          schedule.status === "in_progress" && "bg-warning/10 text-warning",
                          schedule.status === "completed" && "bg-success/10 text-success",
                          schedule.status === "cancelled" && "bg-destructive/10 text-destructive"
                        )}
                      >
                        {schedule.status}
                      </span>
                    </div>

                    {/* Capacity Bar */}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            fillRate >= 100 && "bg-success",
                            fillRate >= 80 && fillRate < 100 && "bg-success/70",
                            fillRate >= 50 && fillRate < 80 && "bg-warning",
                            fillRate < 50 && "bg-destructive/60"
                          )}
                          style={{ width: `${Math.min(fillRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {bookedCount}/{schedule.maxParticipants} booked
                        {available > 0 && !isPast && (
                          <span className="text-success"> • {available} available</span>
                        )}
                      </span>
                    </div>

                    {/* Guide Status - only show if booked or guides required */}
                    {(bookedCount > 0 || (schedule.guidesRequired ?? 0) > 0) && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        {(schedule.guidesAssigned ?? 0) > 0 ? (
                          <span className="flex items-center gap-1.5 text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            {schedule.guidesAssigned}/{schedule.guidesRequired} guides assigned
                          </span>
                        ) : (schedule.guidesRequired ?? 0) > 0 ? (
                          <span className="flex items-center gap-1.5 text-warning">
                            <AlertCircle className="h-4 w-4" />
                            Needs {schedule.guidesRequired} guide{schedule.guidesRequired !== 1 ? 's' : ''}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/org/${orgSlug}/availability/${schedule.id}` as Route}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="View Details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    {!isPast && (
                      <>
                        <Link
                          href={`/org/${orgSlug}/availability/${schedule.id}/edit` as Route}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        {bookedCount === 0 && (
                          <button
                            onClick={() => setDeletingScheduleId(schedule.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View All Link */}
      {filteredSchedules.length > 0 && (
        <div className="p-4 border-t border-border text-center">
          <Link
            href={`/org/${orgSlug}/availability?tourId=${tourId}` as Route}
            className="text-sm text-primary hover:underline"
          >
            View in Availability Calendar
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deletingScheduleId}
        onOpenChange={(open) => !open && setDeletingScheduleId(null)}
        title="Delete Schedule"
        description="Are you sure you want to delete this schedule? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deletingScheduleId) {
            deleteMutation.mutate({ id: deletingScheduleId });
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
