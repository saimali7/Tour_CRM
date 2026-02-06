"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, UserRound, ArrowRightLeft, WandSparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DispatchContextData } from "./canvas-types";
import type { CanvasRow } from "../dispatch-model";

interface ContextPaneProps {
  context: DispatchContextData;
  rows: CanvasRow[];
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

function panelSectionTitle(title: string) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>;
}

function isValidTimeInput(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h = 0, m = 0] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  if (h < 6 || h > 24) return false;
  if (m < 0 || m > 59) return false;
  return true;
}

export function ContextPane({
  context,
  rows,
  warningsCount,
  unassignedGroupsCount,
  isEditing,
  isReadOnly,
  isMutating,
  onAssignBooking,
  onAssignBookingBestFit,
  onMoveRun,
  onRescheduleRun,
  onReturnRunToQueue,
  onResolveWarning,
  onClearSelection,
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

  const canMutate = isEditing && !isReadOnly && !isMutating;

  const guideOptions = useMemo(
    () => rows.map((row) => ({ id: row.guide.id, name: `${row.guide.firstName} ${row.guide.lastName}`.trim() })),
    [rows]
  );

  const selectedWarning = context.selectedWarning;

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-base font-semibold text-foreground">Context</h2>
        <div className="flex items-center gap-1">
          {context.selection.type !== "none" && (
            <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onClearSelection}>
              Clear
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onClose}>
              Hide
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-5">
        {context.selection.type === "none" && (
          <>
            <section className="space-y-2.5 rounded-xl border bg-muted/20 p-3">
              {panelSectionTitle("Dispatch Snapshot")}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-card px-2.5 py-2">
                  <p className="text-muted-foreground">Unassigned</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums">{unassignedGroupsCount}</p>
                </div>
                <div className="rounded-lg bg-card px-2.5 py-2">
                  <p className="text-muted-foreground">Warnings</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums">{warningsCount}</p>
                </div>
                <div className="rounded-lg bg-card px-2.5 py-2">
                  <p className="text-muted-foreground">Guides</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums">{rows.length}</p>
                </div>
                <div className="rounded-lg bg-card px-2.5 py-2">
                  <p className="text-muted-foreground">Editing</p>
                  <p className={cn("mt-0.5 text-base font-semibold", canMutate ? "text-success" : "text-muted-foreground")}>
                    {canMutate ? "On" : "Off"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
              <p>Select a guide, run, booking, or warning to unlock one-click actions.</p>
            </section>
          </>
        )}

        {context.selection.type === "guide" && context.selectedGuide && (
          <section className="space-y-3 rounded-xl border p-4">
            {panelSectionTitle("Guide")}
            <div>
              <p className="text-base font-semibold text-foreground">
                {context.selectedGuide.guide.firstName} {context.selectedGuide.guide.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{context.selectedGuide.totalGuests}/{context.selectedGuide.vehicleCapacity} guests</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-sm">
              <div className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-muted-foreground">Runs</p>
                <p className="font-semibold tabular-nums">{context.selectedGuide.runs.length}</p>
              </div>
              <div className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-muted-foreground">Utilization</p>
                <p className="font-semibold tabular-nums">{context.selectedGuide.utilization}%</p>
              </div>
            </div>
          </section>
        )}

        {context.selection.type === "run" && context.selectedRun && (
          <section className="space-y-4 rounded-xl border p-4">
            {panelSectionTitle("Run Actions")}
            <div>
              <p className="text-base font-semibold text-foreground">{context.selectedRun.run.tourName}</p>
              <p className="text-sm text-muted-foreground">
                {context.selectedRun.run.displayStartLabel} - {context.selectedRun.run.displayEndLabel} • {context.selectedRun.run.guestCount} guests
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="run-move-guide">Move To Guide</label>
              <div className="flex items-center gap-2">
                <select
                  id="run-move-guide"
                  className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm"
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
                  className="h-9 gap-1.5 rounded-lg px-3 text-xs"
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

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="run-jump-time">Start Time (HH:MM)</label>
              <div className="flex items-center gap-2">
                <Input
                  id="run-jump-time"
                  value={jumpTime}
                  onChange={(event) => setJumpTime(event.target.value)}
                  className="h-9 text-sm"
                  placeholder="09:30"
                  disabled={!canMutate}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg px-3 text-xs"
                  disabled={!canMutate || !isValidTimeInput(jumpTime)}
                  onClick={() =>
                    void onRescheduleRun(context.selectedRun!.row.guide.id, context.selectedRun!.run.id, jumpTime)
                  }
                >
                  <CalendarClock className="mr-1 h-3 w-3" />
                  Set
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-center gap-1.5 rounded-lg text-xs"
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
          <section className="space-y-4 rounded-xl border p-4">
            {panelSectionTitle("Booking Actions")}
            <div>
              <p className="text-base font-semibold text-foreground">{context.selectedBooking.booking.customerName}</p>
              <p className="text-sm text-muted-foreground">
                {context.selectedBooking.booking.referenceNumber} • {context.selectedBooking.booking.guestCount} guests
              </p>
              <div className="mt-1">
                <Badge variant="outline" className="h-6 rounded-full px-2 text-xs">
                  {context.selectedBooking.assignedGuideId ? "Assigned" : "Unassigned"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="booking-guide-select">Assign Guide</label>
              <div className="flex items-center gap-2">
                <select
                  id="booking-guide-select"
                  className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm"
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
                  className="h-9 rounded-lg px-3 text-xs"
                  disabled={!canMutate || !bookingGuideId}
                  onClick={() =>
                    void onAssignBooking(context.selectedBooking!.booking.id, bookingGuideId)
                  }
                >
                  <UserRound className="mr-1 h-3 w-3" />
                  Apply
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full gap-1.5 rounded-lg text-xs"
              disabled={!canMutate}
              onClick={() => void onAssignBookingBestFit(context.selectedBooking!.booking.id)}
            >
              <WandSparkles className="h-3 w-3" />
              Assign To Best Fit
            </Button>
          </section>
        )}

        {context.selection.type === "warning" && selectedWarning && (
          <section className="space-y-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
            {panelSectionTitle("Warning")}
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
              <div className="min-w-0">
                <p className="text-base font-medium text-foreground">{selectedWarning.message}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedWarning.tourRunKey ? `Run ${selectedWarning.tourRunKey}` : "No run key"}
                  {selectedWarning.bookingId ? ` • Booking ${selectedWarning.bookingId}` : ""}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Suggested Actions</p>
              {selectedWarning.suggestions.length > 0 ? (
                selectedWarning.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border bg-card px-3 py-2 text-left text-sm hover:border-primary/40"
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
                  className="h-9 w-full justify-center rounded-lg text-xs"
                  onClick={() => onResolveWarning(selectedWarning.id, "res_acknowledge")}
                  disabled={isMutating}
                >
                  Mark Reviewed
                </Button>
              )}
            </div>
          </section>
        )}

        {context.selection.type !== "none" && (
          <section className="rounded-xl border bg-muted/20 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signals</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Linked guides</span>
              <span className="font-medium tabular-nums">{context.warningLinkedGuides.size}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Linked runs</span>
              <span className="font-medium tabular-nums">{context.warningLinkedRunIds.size}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Linked bookings</span>
              <span className="font-medium tabular-nums">{context.warningLinkedBookingIds.size}</span>
            </div>
          </section>
        )}

        {!isEditing && !isReadOnly && (
          <div className="rounded-xl border border-info/30 bg-info/5 p-4 text-sm text-info">
            Enable editing to apply assignment and reschedule actions.
          </div>
        )}

        {isReadOnly && (
          <div className="rounded-xl border border-muted-foreground/25 bg-muted/30 p-4 text-sm text-muted-foreground">
            This date is read-only. Dispatch changes are disabled.
          </div>
        )}
      </div>
    </aside>
  );
}
