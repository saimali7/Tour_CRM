"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, Users, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface BulkRescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBookings: Array<{
    id: string;
    referenceNumber: string;
    tourId?: string | null;
    tour?: { id: string; name: string } | null;
    schedule?: { id: string; startsAt: Date | string } | null;
  }>;
  onSuccess: () => void;
}

export function BulkRescheduleModal({
  open,
  onOpenChange,
  selectedBookings,
  onSuccess,
}: BulkRescheduleModalProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [sendEmails, setSendEmails] = useState(true);

  // Get unique tour IDs from selected bookings
  const tourIds = [...new Set(selectedBookings.map((b) => b.tour?.id || b.tourId).filter(Boolean))];
  const isSingleTour = tourIds.length === 1;

  // Fetch available schedules for the tour (only if single tour)
  const { data: schedules, isLoading: schedulesLoading } = trpc.schedule.list.useQuery(
    {
      filters: {
        tourId: tourIds[0] as string,
        status: "scheduled",
      },
      pagination: { limit: 50 },
    },
    {
      enabled: open && isSingleTour && !!tourIds[0],
    }
  );

  const bulkRescheduleMutation = trpc.booking.bulkReschedule.useMutation({
    onSuccess: (result) => {
      if (result.errors.length === 0) {
        toast.success(`${result.rescheduled.length} bookings rescheduled successfully`);
      } else {
        toast.warning(
          `${result.rescheduled.length} rescheduled, ${result.errors.length} failed`
        );
      }
      onSuccess();
      onOpenChange(false);
      setSelectedScheduleId("");
    },
    onError: (error) => {
      toast.error(`Failed to reschedule: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!selectedScheduleId) {
      toast.error("Please select a new schedule");
      return;
    }

    bulkRescheduleMutation.mutate({
      ids: selectedBookings.map((b) => b.id),
      newScheduleId: selectedScheduleId,
      sendRescheduleEmails: sendEmails,
    });
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  // Filter out current schedule and past schedules
  const availableSchedules = schedules?.data.filter((s) => {
    const now = new Date();
    const scheduleDate = new Date(s.startsAt);
    // Only show future schedules that aren't the current schedule
    const currentScheduleIds = selectedBookings
      .map((b) => b.schedule?.id)
      .filter(Boolean);
    return scheduleDate > now && !currentScheduleIds.includes(s.id);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reschedule {selectedBookings.length} Bookings</DialogTitle>
          <DialogDescription>
            Move selected bookings to a different schedule. Customers will be notified of the change.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Warning for multiple tours */}
          {!isSingleTour && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Multiple tours selected</p>
                  <p className="text-sm text-warning/80 mt-1">
                    Selected bookings are from different tours. Bulk reschedule only works
                    when all bookings are for the same tour.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selected bookings summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Selected Bookings</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedBookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-muted-foreground">
                    {booking.referenceNumber}
                  </span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-foreground">{booking.tour?.name}</span>
                </div>
              ))}
              {selectedBookings.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  ...and {selectedBookings.length - 5} more
                </p>
              )}
            </div>
          </div>

          {/* Schedule selection */}
          {isSingleTour && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Select New Schedule
              </label>
              {schedulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableSchedules && availableSchedules.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableSchedules.map((schedule) => {
                    const available = (schedule.maxParticipants ?? 0) - (schedule.bookedCount ?? 0);
                    const totalParticipantsNeeded = selectedBookings.reduce(
                      (sum, b) => sum + ((b as { totalParticipants?: number }).totalParticipants ?? 0),
                      0
                    );
                    const canAccommodate = available >= totalParticipantsNeeded;

                    return (
                      <button
                        key={schedule.id}
                        type="button"
                        onClick={() => setSelectedScheduleId(schedule.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          selectedScheduleId === schedule.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        } ${!canAccommodate ? "opacity-50" : ""}`}
                        disabled={!canAccommodate}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatDate(schedule.startsAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {formatTime(schedule.startsAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span
                            className={`text-sm ${
                              available > 5
                                ? "text-success"
                                : available > 0
                                ? "text-warning"
                                : "text-destructive"
                            }`}
                          >
                            {available} left
                          </span>
                          {selectedScheduleId === schedule.id && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No available schedules found</p>
                </div>
              )}
            </div>
          )}

          {/* Email notification toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmails}
              onChange={(e) => setSendEmails(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">
              Send reschedule notification emails to customers
            </span>
          </label>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isSingleTour || !selectedScheduleId || bulkRescheduleMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {bulkRescheduleMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Rescheduling...
              </>
            ) : (
              `Reschedule ${selectedBookings.length} Bookings`
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
