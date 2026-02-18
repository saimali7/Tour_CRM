"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  CalendarX,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDbDateKey, formatLocalDateKey, parseDateKeyToLocalDate } from "@/lib/date-time";

interface TourAvailabilityEditorProps {
  tourId: string;
  tourDefaults: {
    maxParticipants: number;
    meetingPoint?: string | null;
    meetingPointDetails?: string | null;
  };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TourAvailabilityEditor({
  tourId,
  tourDefaults,
}: TourAvailabilityEditorProps) {
  const [expandedSection, setExpandedSection] = useState<
    "windows" | "times" | "blackouts" | null
  >("windows");
  const [deletingWindowId, setDeletingWindowId] = useState<string | null>(null);
  const [deletingTimeId, setDeletingTimeId] = useState<string | null>(null);
  const [deletingBlackoutId, setDeletingBlackoutId] = useState<string | null>(
    null
  );

  // Form states for new items
  const [showNewWindow, setShowNewWindow] = useState(false);
  const [showNewTime, setShowNewTime] = useState(false);
  const [showNewBlackout, setShowNewBlackout] = useState(false);

  // New window form
  const [windowName, setWindowName] = useState("");
  const [windowStartDate, setWindowStartDate] = useState(
    formatLocalDateKey(new Date())
  );
  const [windowEndDate, setWindowEndDate] = useState("");
  const [windowDays, setWindowDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [windowCapacity, setWindowCapacity] = useState<number | undefined>(
    undefined
  );

  // New time form
  const [newTime, setNewTime] = useState("09:00");
  const [newTimeLabel, setNewTimeLabel] = useState("");

  // New blackout form
  const [blackoutDate, setBlackoutDate] = useState("");
  const [blackoutReason, setBlackoutReason] = useState("");

  const utils = trpc.useUtils();

  // Fetch tour availability config
  const { data: config, isLoading } =
    trpc.availability.getTourAvailability.useQuery({ tourId });

  // Mutations
  const createWindowMutation =
    trpc.availability.createAvailabilityWindow.useMutation({
      onSuccess: () => {
        utils.availability.getTourAvailability.invalidate({ tourId });
        resetWindowForm();
        toast.success("Availability window created");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create window");
      },
    });

  const deleteWindowMutation =
    trpc.availability.deleteAvailabilityWindow.useMutation({
      onSuccess: () => {
        utils.availability.getTourAvailability.invalidate({ tourId });
        setDeletingWindowId(null);
        toast.success("Availability window deleted");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete window");
      },
    });

  const createTimeMutation = trpc.availability.createDepartureTime.useMutation({
    onSuccess: () => {
      utils.availability.getTourAvailability.invalidate({ tourId });
      resetTimeForm();
      toast.success("Departure time created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create time");
    },
  });

  const deleteTimeMutation = trpc.availability.deleteDepartureTime.useMutation({
    onSuccess: () => {
      utils.availability.getTourAvailability.invalidate({ tourId });
      setDeletingTimeId(null);
      toast.success("Departure time deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete time");
    },
  });

  const createBlackoutMutation =
    trpc.availability.createBlackoutDate.useMutation({
      onSuccess: () => {
        utils.availability.getTourAvailability.invalidate({ tourId });
        resetBlackoutForm();
        toast.success("Blackout date created");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create blackout");
      },
    });

  const deleteBlackoutMutation =
    trpc.availability.deleteBlackoutDate.useMutation({
      onSuccess: () => {
        utils.availability.getTourAvailability.invalidate({ tourId });
        setDeletingBlackoutId(null);
        toast.success("Blackout date deleted");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete blackout");
      },
    });

  const resetWindowForm = () => {
    setShowNewWindow(false);
    setWindowName("");
    setWindowStartDate(formatLocalDateKey(new Date()));
    setWindowEndDate("");
    setWindowDays([0, 1, 2, 3, 4, 5, 6]);
    setWindowCapacity(undefined);
  };

  const resetTimeForm = () => {
    setShowNewTime(false);
    setNewTime("09:00");
    setNewTimeLabel("");
  };

  const resetBlackoutForm = () => {
    setShowNewBlackout(false);
    setBlackoutDate("");
    setBlackoutReason("");
  };

  const toggleDay = (day: number) => {
    setWindowDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreateWindow = () => {
    if (!windowStartDate) {
      toast.error("Start date is required");
      return;
    }
    if (windowDays.length === 0) {
      toast.error("Select at least one day");
      return;
    }

    createWindowMutation.mutate({
      tourId,
      name: windowName || undefined,
      startDate: parseDateKeyToLocalDate(windowStartDate),
      endDate: windowEndDate ? parseDateKeyToLocalDate(windowEndDate) : undefined,
      daysOfWeek: windowDays.sort((a, b) => a - b),
      maxParticipantsOverride: windowCapacity,
    });
  };

  const handleCreateTime = () => {
    if (!newTime || !/^\d{2}:\d{2}$/.test(newTime)) {
      toast.error("Valid time in HH:MM format is required");
      return;
    }

    createTimeMutation.mutate({
      tourId,
      time: newTime,
      label: newTimeLabel || undefined,
    });
  };

  const handleCreateBlackout = () => {
    if (!blackoutDate) {
      toast.error("Blackout date is required");
      return;
    }

    createBlackoutMutation.mutate({
      tourId,
      date: parseDateKeyToLocalDate(blackoutDate),
      reason: blackoutReason || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const windows = config?.windows ?? [];
  const departureTimes = config?.departureTimes ?? [];
  const blackoutDates = config?.blackoutDates ?? [];

  return (
    <div className="space-y-4">
      {/* Availability Windows Section */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <button
          onClick={() =>
            setExpandedSection(
              expandedSection === "windows" ? null : "windows"
            )
          }
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">
                Availability Windows
              </h3>
              <p className="text-sm text-muted-foreground">
                {windows.length} window{windows.length !== 1 ? "s" : ""} •
                Define when this tour operates
              </p>
            </div>
          </div>
          {expandedSection === "windows" ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {expandedSection === "windows" && (
          <div className="border-t border-border p-4 space-y-4">
            {/* Existing windows */}
            {windows.length > 0 ? (
              <div className="space-y-3">
                {windows.map((window) => (
                  <div
                    key={window.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {window.name || "Availability Window"}
                        </span>
                        {!window.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {parseDateKeyToLocalDate(formatDbDateKey(window.startDate)).toLocaleDateString()} –{" "}
                        {window.endDate
                          ? parseDateKeyToLocalDate(formatDbDateKey(window.endDate)).toLocaleDateString()
                          : "Ongoing"}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {DAY_NAMES.map((day, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "text-xs px-2 py-1 rounded",
                              (window.daysOfWeek as number[])?.includes(idx)
                                ? "bg-primary/20 text-primary font-medium"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                      {window.maxParticipantsOverride && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Capacity: {window.maxParticipantsOverride} (override)
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingWindowId(window.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No availability windows defined</p>
                <p className="text-sm">
                  Add a window to set when this tour operates
                </p>
              </div>
            )}

            {/* New window form */}
            {showNewWindow ? (
              <div className="p-4 border border-border rounded-lg bg-background space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="windowName">Name (optional)</Label>
                    <Input
                      id="windowName"
                      value={windowName}
                      onChange={(e) => setWindowName(e.target.value)}
                      placeholder="e.g., Summer Season"
                    />
                  </div>
                  <div>
                    <Label htmlFor="windowCapacity">
                      Capacity Override (optional)
                    </Label>
                    <Input
                      id="windowCapacity"
                      type="number"
                      value={windowCapacity ?? ""}
                      onChange={(e) =>
                        setWindowCapacity(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder={`Default: ${tourDefaults.maxParticipants}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="windowStart">Start Date</Label>
                    <Input
                      id="windowStart"
                      type="date"
                      value={windowStartDate}
                      onChange={(e) => setWindowStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="windowEnd">End Date (optional)</Label>
                    <Input
                      id="windowEnd"
                      type="date"
                      value={windowEndDate}
                      onChange={(e) => setWindowEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Operating Days</Label>
                  <div className="flex gap-2 mt-2">
                    {DAY_NAMES.map((day, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleDay(idx)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          windowDays.includes(idx)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={resetWindowForm}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateWindow}
                    disabled={createWindowMutation.isPending}
                  >
                    {createWindowMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Create Window
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowNewWindow(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Availability Window
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Departure Times Section */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <button
          onClick={() =>
            setExpandedSection(expandedSection === "times" ? null : "times")
          }
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Clock className="h-5 w-5 text-info" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">Departure Times</h3>
              <p className="text-sm text-muted-foreground">
                {departureTimes.length} time
                {departureTimes.length !== 1 ? "s" : ""} • When tours depart
                each day
              </p>
            </div>
          </div>
          {expandedSection === "times" ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {expandedSection === "times" && (
          <div className="border-t border-border p-4 space-y-4">
            {/* Existing times */}
            {departureTimes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {departureTimes.map((dt) => (
                  <div
                    key={dt.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div>
                      <span className="font-mono text-lg font-semibold text-foreground">
                        {dt.time}
                      </span>
                      {dt.label && (
                        <p className="text-xs text-muted-foreground">
                          {dt.label}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingTimeId(dt.id)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No departure times defined</p>
                <p className="text-sm">Add times when tours depart</p>
              </div>
            )}

            {/* New time form */}
            {showNewTime ? (
              <div className="p-4 border border-border rounded-lg bg-background space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newTime">Time (HH:MM)</Label>
                    <Input
                      id="newTime"
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newTimeLabel">Label (optional)</Label>
                    <Input
                      id="newTimeLabel"
                      value={newTimeLabel}
                      onChange={(e) => setNewTimeLabel(e.target.value)}
                      placeholder="e.g., Morning Tour"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={resetTimeForm}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTime}
                    disabled={createTimeMutation.isPending}
                  >
                    {createTimeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Add Time
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowNewTime(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Departure Time
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Blackout Dates Section */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <button
          onClick={() =>
            setExpandedSection(
              expandedSection === "blackouts" ? null : "blackouts"
            )
          }
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <CalendarX className="h-5 w-5 text-destructive" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">Blackout Dates</h3>
              <p className="text-sm text-muted-foreground">
                {blackoutDates.length} date
                {blackoutDates.length !== 1 ? "s" : ""} • Specific dates when
                tour doesn't run
              </p>
            </div>
          </div>
          {expandedSection === "blackouts" ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {expandedSection === "blackouts" && (
          <div className="border-t border-border p-4 space-y-4">
            {/* Existing blackouts */}
            {blackoutDates.length > 0 ? (
              <div className="space-y-2">
                {blackoutDates.map((blackout) => (
                  <div
                    key={blackout.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div>
                      <span className="font-medium text-foreground">
                        {parseDateKeyToLocalDate(formatDbDateKey(blackout.date)).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {blackout.reason && (
                        <p className="text-sm text-muted-foreground">
                          {blackout.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingBlackoutId(blackout.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No blackout dates</p>
                <p className="text-sm">
                  Add dates when the tour shouldn't operate
                </p>
              </div>
            )}

            {/* New blackout form */}
            {showNewBlackout ? (
              <div className="p-4 border border-border rounded-lg bg-background space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="blackoutDate">Date</Label>
                    <Input
                      id="blackoutDate"
                      type="date"
                      value={blackoutDate}
                      onChange={(e) => setBlackoutDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="blackoutReason">Reason (optional)</Label>
                    <Input
                      id="blackoutReason"
                      value={blackoutReason}
                      onChange={(e) => setBlackoutReason(e.target.value)}
                      placeholder="e.g., Holiday"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={resetBlackoutForm}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBlackout}
                    disabled={createBlackoutMutation.isPending}
                  >
                    {createBlackoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Add Blackout
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowNewBlackout(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Blackout Date
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modals */}
      <ConfirmModal
        open={!!deletingWindowId}
        onOpenChange={(open) => !open && setDeletingWindowId(null)}
        title="Delete Availability Window"
        description="Are you sure you want to delete this availability window? This will affect when the tour can be booked."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingWindowId) {
            deleteWindowMutation.mutate({ id: deletingWindowId });
          }
        }}
        isLoading={deleteWindowMutation.isPending}
        variant="destructive"
      />

      <ConfirmModal
        open={!!deletingTimeId}
        onOpenChange={(open) => !open && setDeletingTimeId(null)}
        title="Delete Departure Time"
        description="Are you sure you want to delete this departure time? Existing bookings for this time will not be affected."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingTimeId) {
            deleteTimeMutation.mutate({ id: deletingTimeId });
          }
        }}
        isLoading={deleteTimeMutation.isPending}
        variant="destructive"
      />

      <ConfirmModal
        open={!!deletingBlackoutId}
        onOpenChange={(open) => !open && setDeletingBlackoutId(null)}
        title="Delete Blackout Date"
        description="Are you sure you want to remove this blackout date? The tour will become bookable on this date again."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingBlackoutId) {
            deleteBlackoutMutation.mutate({ id: deletingBlackoutId });
          }
        }}
        isLoading={deleteBlackoutMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
