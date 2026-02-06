"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { format, isToday, isTomorrow, isYesterday, isPast, startOfDay } from "date-fns";
import { AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { trpc, type RouterInputs, type RouterOutputs } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CommandStrip } from "./command-strip";
import { DispatchConfirmDialog } from "./dispatch-confirm-dialog";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
import { GuestCard, type GuestCardBooking } from "./guest-card";
import { GuideCard, type GuideCardData } from "./guide-card";
import { MobileHopperSheet } from "./hopper/mobile-hopper-sheet";
import { DispatchCanvas } from "./dispatch-canvas";
import { LiveAnnouncerProvider, useLiveAnnouncer } from "./live-announcer";
import type { DispatchData, CommandCenterProps, DispatchWarning, DispatchSuggestion } from "./types";
import { buildCommandCenterViewModel, mapStatus, mapWarningType } from "./dispatch-model";
import type { GuideTimeline } from "./timeline/types";

type BatchChange = RouterInputs["commandCenter"]["batchApplyChanges"]["changes"][number];
type DispatchResponse = RouterOutputs["commandCenter"]["getDispatch"];
const MOBILE_TIMELINE_START_MINUTES = 6 * 60;
const MOBILE_TIMELINE_END_MINUTES = 24 * 60;
const MOBILE_SNAP_MINUTES = 15;

interface OperationRecord {
  changes: BatchChange[];
  undoChanges: BatchChange[];
  description: string;
}

function mapWarnings(response: DispatchResponse): DispatchWarning[] {
  const serviceWarnings = response.status.warnings ?? [];
  const unresolved = serviceWarnings.filter((warning) => !warning.resolved);

  if (unresolved.length > 0) {
    return unresolved.map((warning) => ({
      id: warning.id,
      type: mapWarningType(warning.type),
      message: warning.message,
      bookingId: warning.bookingId,
      tourRunKey: warning.tourRunKey,
      suggestions: (warning.resolutions ?? []).map((resolution) => ({
        id: resolution.id,
        label: resolution.label,
        guideId: resolution.guideId,
        impact: resolution.impactMinutes ? `+${resolution.impactMinutes}m` : undefined,
        action: resolution.action as DispatchSuggestion["action"] | undefined,
      })),
    }));
  }

  // Fallback warnings when status warnings are empty but tour runs still need staffing.
  const fallback: DispatchWarning[] = [];
  for (const run of response.tourRuns) {
    if (run.status === "unassigned") {
      fallback.push({
        id: `warning_${run.key}_unassigned`,
        type: "no_guide",
        message: `${run.tour?.name ?? "Tour"} at ${run.time} has no guide assigned`,
        tourRunKey: run.key,
        suggestions: [],
      });
    } else if (run.status === "partial") {
      fallback.push({
        id: `warning_${run.key}_partial`,
        type: "capacity",
        message: `${run.tour?.name ?? "Tour"} at ${run.time} needs ${run.guidesNeeded - run.guidesAssigned} more guide(s)`,
        tourRunKey: run.key,
        suggestions: [],
      });
    }
  }

  return fallback;
}

function mapGuideTimelinesForMobile(
  timelines: DispatchResponse["timelines"]
): GuideTimeline[] {
  return timelines
    .filter((timeline) => !timeline.guide.id.startsWith("outsourced:"))
    .map((timeline) => ({
    guide: {
      ...timeline.guide,
      email: timeline.guide.email ?? "",
      vehicleCapacity: timeline.vehicleCapacity,
      status: "active",
    },
    segments: [],
    totalDriveMinutes: timeline.totalDriveMinutes,
    totalGuests: timeline.totalGuests,
    utilization: timeline.utilization,
  }));
}

function parseMinutes(time: string): number {
  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return MOBILE_TIMELINE_START_MINUTES;
  return hour * 60 + minute;
}

function formatMinutes(minutes: number): string {
  const safe = Math.max(MOBILE_TIMELINE_START_MINUTES, Math.min(MOBILE_TIMELINE_END_MINUTES, minutes));
  const hour = Math.floor(safe / 60);
  const minute = safe % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function shiftStartTime(time: string, deltaMinutes: number, durationMinutes: number): string {
  const current = parseMinutes(time);
  const latestStart = MOBILE_TIMELINE_END_MINUTES - durationMinutes;
  const target = current + deltaMinutes;
  const snapped = Math.round(target / MOBILE_SNAP_MINUTES) * MOBILE_SNAP_MINUTES;
  const clamped = Math.max(MOBILE_TIMELINE_START_MINUTES, Math.min(latestStart, snapped));
  return formatMinutes(clamped);
}

function CommandCenterContent({
  date,
  onDateChange: _onDateChange,
  onPreviousDay,
  onNextDay,
  onToday,
}: CommandCenterProps) {
  const { announce } = useLiveAnnouncer();
  const utils = trpc.useUtils();

  const [showDispatchConfirm, setShowDispatchConfirm] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestCardBooking | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideCardData | null>(null);
  const [selectedWarningId, setSelectedWarningId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<OperationRecord[]>([]);
  const [redoStack, setRedoStack] = useState<OperationRecord[]>([]);

  const dateString = format(date, "yyyy-MM-dd");
  const isPastDate = isPast(startOfDay(date)) && !isToday(date);

  const {
    data: dispatchResponse,
    isLoading,
    error,
  } = trpc.commandCenter.getDispatch.useQuery(
    { date: dateString },
    {
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    }
  );

  const optimizeMutation = trpc.commandCenter.optimize.useMutation({
    onSuccess: (result) => {
      utils.commandCenter.getDispatch.invalidate({ date: dateString });
      if (result.warnings.length > 0) {
        toast.warning(`Optimization complete with ${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"}`);
      } else {
        toast.success("Optimization complete");
      }
    },
    onError: (mutationError) => {
      toast.error("Optimization failed", { description: mutationError.message });
    },
  });

  const dispatchMutation = trpc.commandCenter.dispatch.useMutation({
    onSuccess: (result) => {
      utils.commandCenter.getDispatch.invalidate({ date: dateString });
      toast.success("Dispatch sent", { description: `${result.guidesNotified.length} guides notified` });
      announce(`Dispatch sent for ${dateString}. ${result.guidesNotified.length} guides notified.`, "assertive");
    },
    onError: (mutationError) => {
      toast.error("Dispatch failed", { description: mutationError.message });
      announce(`Dispatch failed: ${mutationError.message}`, "assertive");
    },
  });

  const resolveWarningMutation = trpc.commandCenter.resolveWarning.useMutation({
    onSuccess: () => {
      utils.commandCenter.getDispatch.invalidate({ date: dateString });
      toast.success("Warning resolved");
    },
    onError: (mutationError) => {
      toast.error("Failed to resolve warning", { description: mutationError.message });
    },
  });

  const batchMutation = trpc.commandCenter.batchApplyChanges.useMutation({
    onError: (mutationError) => {
      toast.error("Assignment update failed", { description: mutationError.message });
    },
  });

  const addOutsourcedGuideMutation = trpc.commandCenter.addOutsourcedGuideToRun.useMutation({
    onError: (mutationError) => {
      toast.error("Failed to add outsourced guide", { description: mutationError.message });
    },
  });

  const warnings = useMemo(() => {
    if (!dispatchResponse) return [];
    return mapWarnings(dispatchResponse);
  }, [dispatchResponse]);

  const viewModel = useMemo(() => {
    if (!dispatchResponse) return null;
    return buildCommandCenterViewModel(dispatchResponse);
  }, [dispatchResponse]);

  const rowsForCanvas = useMemo(() => {
    if (!viewModel) return [];
    const warningRunKeys = new Set(
      warnings.map((warning) => warning.tourRunKey).filter((value): value is string => Boolean(value))
    );
    const warningBookingIds = new Set(
      warnings.map((warning) => warning.bookingId).filter((value): value is string => Boolean(value))
    );

    return viewModel.rows.map((row) => ({
      ...row,
      runs: row.runs.map((run) => ({
        ...run,
        isWarningLinked:
          warningRunKeys.has(run.tourRunKey) ||
          run.bookingIds.some((bookingId) => warningBookingIds.has(bookingId)),
      })),
    }));
  }, [viewModel, warnings]);

  const dispatchData = useMemo<DispatchData | null>(() => {
    if (!dispatchResponse) return null;

    return {
      status: mapStatus(dispatchResponse.status.status, dispatchResponse.status.unresolvedWarnings),
      totalGuests: dispatchResponse.status.totalGuests,
      totalGuides: dispatchResponse.status.totalGuides,
      totalDriveMinutes: dispatchResponse.status.totalDriveMinutes,
      efficiencyScore: dispatchResponse.status.efficiencyScore,
      dispatchedAt: dispatchResponse.status.dispatchedAt ?? undefined,
      warnings,
      guideTimelines: [],
    };
  }, [dispatchResponse, warnings]);

  const availableGuides = useMemo(() => {
    if (!viewModel) return [];
    return viewModel.rows
      .filter((row) => !row.isOutsourced)
      .map((row) => ({
      id: row.guide.id,
      name: `${row.guide.firstName} ${row.guide.lastName}`.trim(),
      vehicleCapacity: row.vehicleCapacity,
      currentGuests: row.totalGuests,
    }));
  }, [viewModel]);

  const unassignedCount = useMemo(
    () => viewModel?.groups.reduce((sum, group) => sum + group.totalBookings, 0) ?? 0,
    [viewModel]
  );

  const runLookup = useMemo(() => {
    const map = new Map<string, { guideId: string; run: (typeof rowsForCanvas)[number]["runs"][number] }>();
    for (const row of rowsForCanvas) {
      for (const run of row.runs) {
        map.set(run.id, { guideId: row.guide.id, run });
      }
    }
    return map;
  }, [rowsForCanvas]);

  const mobileAssignedRuns = useMemo(
    () =>
      rowsForCanvas
        .filter((row) => !row.isOutsourced)
        .flatMap((row) =>
        row.runs.map((run) => ({
          id: run.id,
          guideId: row.guide.id,
          guideName: `${row.guide.firstName} ${row.guide.lastName}`.trim(),
          tourName: run.tourName,
          startTime: run.startTime,
          endTime: run.endTime,
          guestCount: run.guestCount,
        }))
      ),
    [rowsForCanvas]
  );

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const isMutating = batchMutation.isPending || addOutsourcedGuideMutation.isPending;
  const isReadOnly = dispatchData?.status === "dispatched" || isPastDate;

  useEffect(() => {
    if (!selectedWarningId) return;
    if (warnings.some((warning) => warning.id === selectedWarningId)) return;
    setSelectedWarningId(null);
  }, [selectedWarningId, warnings]);

  const executeOperation = useCallback(
    async (operation: OperationRecord, options?: { record?: boolean; toastPrefix?: string }) => {
      const shouldRecord = options?.record ?? true;

      const result = await batchMutation.mutateAsync({
        date,
        changes: operation.changes,
      });

      if (!result.success) {
        throw new Error("Operation did not succeed");
      }

      await utils.commandCenter.getDispatch.invalidate({ date: dateString });
      if (shouldRecord) {
        setUndoStack((prev) => [...prev, operation]);
        setRedoStack([]);
      }

      if (operation.description) {
        toast.success(options?.toastPrefix ? `${options.toastPrefix}: ${operation.description}` : operation.description);
        announce(operation.description);
      }
    },
    [announce, batchMutation, date, dateString, utils.commandCenter.getDispatch]
  );

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0 || isMutating) return;
    const operation = undoStack[undoStack.length - 1]!;
    const inverse: OperationRecord = {
      changes: operation.undoChanges,
      undoChanges: operation.changes,
      description: `Undid: ${operation.description}`,
    };

    await executeOperation(inverse, { record: false, toastPrefix: "Undo" });
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, operation]);
  }, [executeOperation, isMutating, undoStack]);

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0 || isMutating) return;
    const operation = redoStack[redoStack.length - 1]!;
    await executeOperation(operation, { record: false, toastPrefix: "Redo" });
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, operation]);
  }, [executeOperation, isMutating, redoStack]);

  const handleApplyOperation = useCallback(
    async (operation: OperationRecord) => {
      await executeOperation(operation);
    },
    [executeOperation]
  );

  const handleOptimize = useCallback(() => {
    optimizeMutation.mutate({ date: dateString });
  }, [dateString, optimizeMutation]);

  const handleDispatch = useCallback(() => {
    setShowDispatchConfirm(true);
  }, []);

  const handleConfirmDispatch = useCallback(() => {
    dispatchMutation.mutate({ date: dateString });
    setShowDispatchConfirm(false);
  }, [dateString, dispatchMutation]);

  const handleResolveWarning = useCallback(
    (warningId: string, suggestionId: string) => {
      setSelectedWarningId(warningId);
      const warning = warnings.find((item) => item.id === warningId);
      const suggestion = warning?.suggestions.find((item) => item.id === suggestionId);

      let type: "assign_guide" | "add_external" | "skip" | "cancel" = "skip";
      let guideId: string | undefined;

      if (suggestion?.action === "assign_guide" && suggestion.guideId) {
        type = "assign_guide";
        guideId = suggestion.guideId;
      } else if (suggestion?.action === "add_external") {
        type = "add_external";
      } else if (suggestion?.action === "cancel_tour") {
        type = "cancel";
      }

      if (!guideId && suggestionId.startsWith("quick_assign_")) {
        type = "assign_guide";
        guideId = suggestionId.replace("quick_assign_", "");
      }

      resolveWarningMutation.mutate({
        date: dateString,
        warningId,
        resolution: {
          id: suggestionId,
          type,
          guideId,
          bookingId: warning?.bookingId,
          tourRunKey: warning?.tourRunKey,
        },
      });
    },
    [dateString, resolveWarningMutation, warnings]
  );

  const handleBookingClick = useCallback(
    (bookingId: string) => {
      const booking = viewModel?.bookingLookup.get(bookingId) ?? null;
      setSelectedGuest(booking);
    },
    [viewModel]
  );

  const handleGuideClick = useCallback(
    (guideId: string) => {
      const guide = viewModel?.guideLookup.get(guideId) ?? null;
      setSelectedGuide(guide);
    },
    [viewModel]
  );

  const handleMobileAssign = useCallback(
    async (bookingId: string, guideId: string, guideName: string) => {
      const operation: OperationRecord = {
        changes: [{ type: "assign", bookingId, toGuideId: guideId }],
        undoChanges: [{ type: "unassign", bookingIds: [bookingId], fromGuideId: guideId }],
        description: `Assigned booking to ${guideName}`,
      };
      await executeOperation(operation);
    },
    [executeOperation]
  );

  const handleMobileReassignRun = useCallback(
    async (runId: string, fromGuideId: string, toGuideId: string) => {
      const source = runLookup.get(runId);
      if (!source) return;

      const targetRow = rowsForCanvas.find((row) => row.guide.id === toGuideId);
      if (!targetRow) return;
      if (targetRow.isOutsourced) {
        toast.error("Cannot assign directly to outsourced lanes");
        return;
      }

      const projectedGuests = targetRow.runs
        .filter((run) => run.startTime === source.run.startTime)
        .reduce((sum, run) => sum + run.guestCount, 0) + source.run.guestCount;
      if (projectedGuests > targetRow.vehicleCapacity) {
        toast.error(
          `${targetRow.guide.firstName} ${targetRow.guide.lastName} would exceed slot capacity (${projectedGuests}/${targetRow.vehicleCapacity})`
        );
        return;
      }

      const operation: OperationRecord = {
        changes: [
          {
            type: "reassign",
            bookingIds: [...source.run.bookingIds],
            fromGuideId,
            toGuideId,
          },
        ],
        undoChanges: [
          {
            type: "reassign",
            bookingIds: [...source.run.bookingIds],
            fromGuideId: toGuideId,
            toGuideId: fromGuideId,
          },
        ],
        description: `Moved ${source.run.tourName} to ${targetRow.guide.firstName} ${targetRow.guide.lastName}`,
      };
      await executeOperation(operation);
    },
    [executeOperation, rowsForCanvas, runLookup]
  );

  const handleAddOutsourcedGuideToRun = useCallback(
    async (tourRunKey: string, draft: { name: string; contact?: string }) => {
      const result = await addOutsourcedGuideMutation.mutateAsync({
        date: dateString,
        tourRunKey,
        externalGuideName: draft.name,
        externalGuideContact: draft.contact,
      });

      await utils.commandCenter.getDispatch.invalidate({ date: dateString });
      if (result.noop) {
        toast.message(result.message);
        announce(result.message);
        return;
      }

      toast.success(result.message);
      announce(result.message);
    },
    [addOutsourcedGuideMutation, announce, dateString, utils.commandCenter.getDispatch]
  );

  const handleMobileNudgeRun = useCallback(
    async (runId: string, guideId: string, deltaMinutes: number) => {
      const source = runLookup.get(runId);
      if (!source) return;

      const newStartTime = shiftStartTime(source.run.startTime, deltaMinutes, source.run.durationMinutes);
      if (newStartTime === source.run.startTime) return;

      const operation: OperationRecord = {
        changes: [
          {
            type: "time-shift",
            bookingIds: [...source.run.bookingIds],
            guideId,
            newStartTime,
          },
        ],
        undoChanges: [
          {
            type: "time-shift",
            bookingIds: [...source.run.bookingIds],
            guideId,
            newStartTime: source.run.startTime,
          },
        ],
        description: `Rescheduled ${source.run.tourName} to ${newStartTime}`,
      };
      await executeOperation(operation);
    },
    [executeOperation, runLookup]
  );

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        void handleUndo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        void handleRedo();
      }
      if (event.key === "?") {
        event.preventDefault();
        setShowShortcutsModal(true);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleRedo, handleUndo]);

  const formattedDate = useMemo(() => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEE, MMM d");
  }, [date]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <Skeleton className="h-14 w-full flex-none rounded-lg" />
        <Skeleton className="w-full flex-1 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to load dispatch data</p>
              <p className="text-xs text-destructive/70">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dispatchResponse || !dispatchData || !viewModel) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-lg border bg-card">
        <div className="p-8 text-center">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No dispatch data available for this date.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <CommandStrip
        date={date}
        formattedDate={formattedDate}
        onPreviousDay={onPreviousDay}
        onNextDay={onNextDay}
        onToday={onToday}
        status={dispatchData.status}
        totalGuests={dispatchData.totalGuests}
        totalGuides={dispatchData.totalGuides}
        efficiencyScore={dispatchData.efficiencyScore}
        unassignedCount={unassignedCount}
        warningsCount={warnings.length}
        dispatchedAt={dispatchData.dispatchedAt}
        tourRuns={dispatchResponse.tourRuns}
        warnings={warnings}
        selectedWarningId={selectedWarningId}
        onSelectWarning={(warningId) => setSelectedWarningId(warningId)}
        availableGuides={availableGuides}
        onOptimize={handleOptimize}
        onDispatch={handleDispatch}
        onResolveWarning={handleResolveWarning}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isMutating={isMutating}
      />

      <div className={cn("min-h-0 flex-1 overflow-hidden rounded-lg border bg-card", isReadOnly && "opacity-90")}>
        <DispatchCanvas
          rows={rowsForCanvas}
          groups={viewModel.groups}
          bookingLookup={viewModel.bookingLookup}
          warnings={warnings}
          selectedWarningId={selectedWarningId}
          isReadOnly={isReadOnly}
          isMutating={isMutating}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onApplyOperation={handleApplyOperation}
          onGuideClick={handleGuideClick}
          onBookingClick={handleBookingClick}
          onResolveWarning={handleResolveWarning}
          onAddOutsourcedGuideToRun={handleAddOutsourcedGuideToRun}
          showCurrentTime={isToday(date)}
        />
      </div>

      <MobileHopperSheet
        bookings={viewModel.groups.flatMap((group) => group.bookings)}
        guideTimelines={mapGuideTimelinesForMobile(dispatchResponse.timelines)}
        assignedRuns={mobileAssignedRuns}
        onAssign={handleMobileAssign}
        onReassignRun={handleMobileReassignRun}
        onNudgeRun={handleMobileNudgeRun}
        isLoading={isMutating}
        isReadOnly={isReadOnly}
      />

      <GuestCard
        open={Boolean(selectedGuest)}
        onClose={() => setSelectedGuest(null)}
        booking={selectedGuest}
      />

      <GuideCard
        open={Boolean(selectedGuide)}
        onClose={() => setSelectedGuide(null)}
        guide={selectedGuide}
      />

      <DispatchConfirmDialog
        open={showDispatchConfirm}
        onOpenChange={setShowDispatchConfirm}
        onConfirm={handleConfirmDispatch}
        isLoading={dispatchMutation.isPending}
        date={date}
        guideCount={dispatchData.totalGuides}
        totalGuests={dispatchData.totalGuests}
        efficiencyScore={dispatchData.efficiencyScore}
        warningsCount={warnings.length}
      />

      <KeyboardShortcutsModal
        open={showShortcutsModal}
        onOpenChange={setShowShortcutsModal}
      />
    </div>
  );
}

export function CommandCenter(props: CommandCenterProps) {
  return (
    <LiveAnnouncerProvider>
      <CommandCenterContent {...props} />
    </LiveAnnouncerProvider>
  );
}
