"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, UserRound, ArrowRightLeft, WandSparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DispatchContextData } from "./canvas-types";
import type { CanvasRow } from "../dispatch-model";
import type { GuestCardBooking } from "../guest-card";

interface ContextPaneProps {
  context: DispatchContextData;
  rows: CanvasRow[];
  bookingLookup: Map<string, GuestCardBooking>;
  warningsCount: number;
  unassignedGroupsCount: number;
  isEditing: boolean;
  isReadOnly: boolean;
  isMutating: boolean;
  onAssignBooking: (bookingId: string, guideId: string) => Promise<void>;
  onAssignBookingBestFit: (bookingId: string) => Promise<void>;
  onMoveRun: (guideId: string, runId: string, targetGuideId: string) => Promise<void>;
  onRescheduleRun: (guideId: string, runId: string, newStartTime: string) => Promise<void>;
  onReturnRunToQueue: (guideId: string, runId: string) => Promise<void>;
  onResolveWarning: (warningId: string, suggestionId: string) => void;
  onClearSelection: () => void;
  onClose?: () => void;
}

function sectionTitle(title: string) {
  return <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>;
}

function isValidTimeInput(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h = 0, m = 0] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  if (h < 6 || h > 24) return false;
  if (m < 0 || m > 59) return false;
  return true;
}

/** Dynamic title based on selection type */
function panelTitle(selection: DispatchContextData["selection"]): string {
  switch (selection.type) {
    case "guide": return "Guide";
    case "run": return "Run";
    case "booking": return "Booking";
    case "warning": return "Warning";
    default: return "Context";
  }
}

function bookingModeLabel(mode: GuestCardBooking["experienceMode"]): string {
  if (mode === "charter") return "Private";
  if (mode === "book") return "Private";
  return "Shared";
}

interface RunSignalSummary {
  key: "vip" | "accessibility" | "children";
  label: string;
  count: number;
  className: string;
}

export function ContextPane({
  context,
  rows,
  bookingLookup,
  warningsCount: _warningsCount,
  unassignedGroupsCount: _unassignedGroupsCount,
  isEditing,
  isReadOnly,
  isMutating,
  onAssignBooking,
  onAssignBookingBestFit,
  onMoveRun,
  onRescheduleRun,
  onReturnRunToQueue,
  onResolveWarning,
  onClearSelection: _onClearSelection,
  onClose,
}: ContextPaneProps) {
  const [moveGuideId, setMoveGuideId] = useState("");
  const [jumpTime, setJumpTime] = useState("");
  const [bookingGuideId, setBookingGuideId] = useState("");

  useEffect(() => {
    if (context.selectedRun) {
      setMoveGuideId("");
      setJumpTime(context.selectedRun.run.startTime);
    }
  }, [context.selectedRun]);

  useEffect(() => {
    if (context.selectedBooking) {
      setBookingGuideId(context.selectedBooking.assignedGuideId ?? "");
    }
  }, [context.selectedBooking]);

  // Escape key closes pane
  useEffect(() => {
    if (!onClose) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const canMutate = isEditing && !isReadOnly && !isMutating;

  const guideOptions = useMemo(
    () =>
      rows
        .filter((row) => !row.isOutsourced)
        .map((row) => ({ id: row.guide.id, name: `${row.guide.firstName} ${row.guide.lastName}`.trim() })),
    [rows]
  );

  const selectedWarning = context.selectedWarning;
  const selectedRunBookings = useMemo(() => {
    if (!context.selectedRun) return [];
    return context.selectedRun.run.bookingIds
      .map((bookingId) => bookingLookup.get(bookingId))
      .filter((booking): booking is GuestCardBooking => Boolean(booking));
  }, [context.selectedRun, bookingLookup]);
  const runSignalSummary = useMemo<RunSignalSummary[]>(() => {
    if (!context.selectedRun) return [];

    const vipCount = selectedRunBookings.filter((booking) => Boolean(booking.specialOccasion)).length;
    const accessibilityCount = selectedRunBookings.filter((booking) => Boolean(booking.accessibilityNeeds)).length;
    const childrenCount = selectedRunBookings.filter((booking) => (booking.childCount ?? 0) > 0).length;

    const summary: RunSignalSummary[] = [];
    if (vipCount > 0) {
      summary.push({
        key: "vip",
        label: "VIP",
        count: vipCount,
        className: "border-amber-400/40 bg-amber-500/10 text-amber-300",
      });
    }
    if (accessibilityCount > 0) {
      summary.push({
        key: "accessibility",
        label: "Accessibility",
        count: accessibilityCount,
        className: "border-violet-400/40 bg-violet-500/10 text-violet-300",
      });
    }
    if (childrenCount > 0) {
      summary.push({
        key: "children",
        label: "Children",
        count: childrenCount,
        className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
      });
    }

    return summary;
  }, [context.selectedRun, selectedRunBookings]);

  // If nothing is selected, don't render the pane body
  if (context.selection.type === "none") {
    return null;
  }

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <h2 className="text-sm font-semibold text-foreground">{panelTitle(context.selection)}</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2.5 pb-4">
        {context.selection.type === "guide" && context.selectedGuide && (
          <section className="space-y-2.5 rounded-lg border p-3">
            {sectionTitle("Guide")}
            <div>
              <p className="text-sm font-semibold text-foreground">
                {context.selectedGuide.guide.firstName} {context.selectedGuide.guide.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{context.selectedGuide.totalGuests} guests today</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/30 px-2.5 py-1.5">
                <p className="text-muted-foreground">Runs</p>
                <p className="font-semibold tabular-nums">{context.selectedGuide.runs.length}</p>
              </div>
              <div className="rounded-md bg-muted/30 px-2.5 py-1.5">
                <p className="text-muted-foreground">Utilization</p>
                <p className="font-semibold tabular-nums">{context.selectedGuide.utilization}%</p>
              </div>
            </div>
          </section>
        )}

        {context.selection.type === "run" && context.selectedRun && (
          <section className="space-y-3 rounded-lg border p-3">
            {sectionTitle("Run Actions")}
            <div>
              <p className="text-sm font-semibold text-foreground">{context.selectedRun.run.tourName}</p>
              <p className="text-xs text-muted-foreground">
                {context.selectedRun.run.displayStartLabel} - {context.selectedRun.run.displayEndLabel} &middot; {context.selectedRun.run.guestCount} guests
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Run Signals</p>
              {runSignalSummary.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {runSignalSummary.map((signal) => (
                    <span
                      key={signal.key}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        signal.className
                      )}
                    >
                      <span>{signal.label}</span>
                      <span className="tabular-nums opacity-90">({signal.count})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No advisory signals on this run.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Booking Summary</p>
              {selectedRunBookings.length > 0 ? (
                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-0.5">
                  {selectedRunBookings.map((booking) => {
                    const chips: string[] = [bookingModeLabel(booking.experienceMode)];

                    return (
                      <div key={booking.id} className="rounded-md border bg-muted/20 px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-medium text-foreground">{booking.referenceNumber}</p>
                          <p className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{booking.guestCount} guests</p>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">{booking.customerName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{chips.join(" · ")}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No booking details available for this run.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground" htmlFor="run-move-guide">Move To Guide</label>
              <div className="flex items-center gap-1.5">
                <select
                  id="run-move-guide"
                  className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
                  value={moveGuideId}
                  onChange={(event) => setMoveGuideId(event.target.value)}
                  disabled={!canMutate}
                >
                  <option value="">Select guide</option>
                  {guideOptions
                    .filter((guide) => guide.id !== context.selectedRun!.row.guide.id)
                    .map((guide) => (
                      <option key={guide.id} value={guide.id}>
                        {guide.name}
                      </option>
                    ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 rounded-md px-2.5 text-[11px]"
                  disabled={!canMutate || !moveGuideId}
                  onClick={() =>
                    void onMoveRun(context.selectedRun!.row.guide.id, context.selectedRun!.run.id, moveGuideId)
                  }
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  Move
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground" htmlFor="run-jump-time">Start Time (HH:MM)</label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="run-jump-time"
                  value={jumpTime}
                  onChange={(event) => setJumpTime(event.target.value)}
                  className="h-8 text-xs"
                  placeholder="09:30"
                  disabled={!canMutate}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md px-2.5 text-[11px]"
                  disabled={!canMutate || !isValidTimeInput(jumpTime)}
                  onClick={() =>
                    void onRescheduleRun(context.selectedRun!.row.guide.id, context.selectedRun!.run.id, jumpTime)
                  }
                >
                  <CalendarClock className="mr-0.5 h-3 w-3" />
                  Set
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full justify-center gap-1.5 rounded-md text-[11px]"
              disabled={!canMutate}
              onClick={() =>
                void onReturnRunToQueue(context.selectedRun!.row.guide.id, context.selectedRun!.run.id)
              }
            >
              <Undo2 className="h-3 w-3" />
              Return To Queue
            </Button>
          </section>
        )}

        {context.selection.type === "booking" && context.selectedBooking && (
          <section className="space-y-3 rounded-lg border p-3">
            {sectionTitle("Booking Actions")}
            <div>
              <p className="text-sm font-semibold text-foreground">{context.selectedBooking.booking.customerName}</p>
              <p className="text-xs text-muted-foreground">
                {context.selectedBooking.booking.referenceNumber} &middot; {context.selectedBooking.booking.guestCount} guests
              </p>
              <div className="mt-1">
                <Badge variant="outline" className="h-5 rounded-full px-1.5 text-[10px]">
                  {context.selectedBooking.assignedGuideId ? "Assigned" : "Unassigned"}
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground" htmlFor="booking-guide-select">Assign Guide</label>
              <div className="flex items-center gap-1.5">
                <select
                  id="booking-guide-select"
                  className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
                  value={bookingGuideId}
                  onChange={(event) => setBookingGuideId(event.target.value)}
                  disabled={!canMutate}
                >
                  <option value="">Select guide</option>
                  {guideOptions.map((guide) => (
                    <option key={guide.id} value={guide.id}>
                      {guide.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md px-2.5 text-[11px]"
                  disabled={!canMutate || !bookingGuideId}
                  onClick={() =>
                    void onAssignBooking(context.selectedBooking!.booking.id, bookingGuideId)
                  }
                >
                  <UserRound className="mr-0.5 h-3 w-3" />
                  Apply
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full gap-1.5 rounded-md text-[11px]"
              disabled={!canMutate}
              onClick={() => void onAssignBookingBestFit(context.selectedBooking!.booking.id)}
            >
              <WandSparkles className="h-3 w-3" />
              Assign To Best Fit
            </Button>
          </section>
        )}

        {context.selection.type === "warning" && selectedWarning && (
          <section className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
            {sectionTitle("Warning")}
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-warning" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{selectedWarning.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedWarning.tourRunKey ? `Run ${selectedWarning.tourRunKey}` : "No run key"}
                  {selectedWarning.bookingId ? ` \u00B7 Booking ${selectedWarning.bookingId}` : ""}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">Suggested Actions</p>
              {selectedWarning.suggestions.length > 0 ? (
                selectedWarning.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border bg-card px-2.5 py-1.5 text-left text-xs hover:border-primary/40"
                    onClick={() => onResolveWarning(selectedWarning.id, suggestion.id)}
                    disabled={isMutating}
                  >
                    <span className="min-w-0 flex-1 truncate">{suggestion.label}</span>
                    {suggestion.impact && <span className="shrink-0 tabular-nums text-muted-foreground">{suggestion.impact}</span>}
                  </button>
                ))
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-center rounded-md text-[11px]"
                  onClick={() => onResolveWarning(selectedWarning.id, "res_acknowledge")}
                  disabled={isMutating}
                >
                  Mark Reviewed
                </Button>
              )}
            </div>
          </section>
        )}

        {isReadOnly && (
          <div className="rounded-lg border border-muted-foreground/25 bg-muted/30 p-3 text-xs text-muted-foreground">
            This date is read-only. Dispatch changes are disabled.
          </div>
        )}
      </div>
    </aside>
  );
}
