"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CanvasRow, CanvasRun, HopperGroup } from "../dispatch-model";
import type { GuestCardBooking } from "../guest-card";
import type { DispatchWarning } from "../types";
import { durationToPercent, timeToPercent } from "../timeline/timeline-utils";
import type {
  ContextSelection,
  DispatchContextData,
  DispatchOperation,
  DragPayload,
  DragPreview,
  LanePressureLevel,
  QueueFilterState,
  QueueSortMode,
} from "./canvas-types";
import { QueuePane } from "./queue-pane";
import { TimelinePane } from "./timeline-pane";
import { ContextPane } from "./context-pane";

const SNAP_INTERVAL_MINUTES = 15;
const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 24;
const TIMELINE_START_MINUTES = TIMELINE_START_HOUR * 60;
const TIMELINE_END_MINUTES = TIMELINE_END_HOUR * 60;
const TIMELINE_SCROLL_EDGE_PX = 72;
const TIMELINE_SCROLL_STEP_PX = 36;

const TIMELINE_ZOOM_OPTIONS = [
  { label: "Overview", value: 1 },
  { label: "Focus", value: 1.25 },
  { label: "Precision", value: 1.5 },
] as const;

interface DispatchShellProps {
  rows: CanvasRow[];
  groups: HopperGroup[];
  bookingLookup: Map<string, GuestCardBooking>;
  warnings: DispatchWarning[];
  selectedWarningId?: string | null;
  isReadOnly: boolean;
  isEditing: boolean;
  onEditingChange: (value: boolean) => void;
  isMutating: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => Promise<void>;
  onRedo: () => Promise<void>;
  onApplyOperation: (operation: DispatchOperation) => Promise<void>;
  onGuideClick: (guideId: string) => void;
  onBookingClick: (bookingId: string) => void;
  onResolveWarning: (warningId: string, suggestionId: string) => void;
  showCurrentTime: boolean;
}

interface Marker {
  time: string;
  label: string;
  left: number;
}

function hourMarkers(): Marker[] {
  const markers: Marker[] = [];
  for (let hour = TIMELINE_START_HOUR; hour <= TIMELINE_END_HOUR; hour += 1) {
    const time = `${hour.toString().padStart(2, "0")}:00`;
    markers.push({
      time,
      label: formatTimeLabel(time),
      left: timeToPercent(time),
    });
  }
  return markers;
}

function formatTimeLabel(time: string): string {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  if (hour === 0 || hour === 24) return minute === 0 ? "12 AM" : `12:${minute.toString().padStart(2, "0")} AM`;
  if (hour === 12) return minute === 0 ? "12 PM" : `12:${minute.toString().padStart(2, "0")} PM`;
  const displayHour = hour > 12 ? hour - 12 : hour;
  const period = hour >= 12 ? "PM" : "AM";
  return minute === 0 ? `${displayHour} ${period}` : `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

function parseMinutes(time: string): number {
  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return TIMELINE_START_MINUTES;
  return hour * 60 + minute;
}

function formatMinutes(minutes: number): string {
  const safe = Math.max(TIMELINE_START_MINUTES, Math.min(TIMELINE_END_MINUTES, minutes));
  const hour = Math.floor(safe / 60);
  const minute = safe % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function normalizeStartTime(time: string, durationMinutes: number): string {
  const minutes = parseMinutes(time);
  const latestStart = TIMELINE_END_MINUTES - durationMinutes;
  const snapped = Math.round(minutes / SNAP_INTERVAL_MINUTES) * SNAP_INTERVAL_MINUTES;
  const clamped = Math.max(TIMELINE_START_MINUTES, Math.min(latestStart, snapped));
  return formatMinutes(clamped);
}

function shiftStartTime(time: string, deltaMinutes: number, durationMinutes: number): string {
  const current = parseMinutes(time);
  const latestStart = TIMELINE_END_MINUTES - durationMinutes;
  const target = current + deltaMinutes;
  const snapped = Math.round(target / SNAP_INTERVAL_MINUTES) * SNAP_INTERVAL_MINUTES;
  const clamped = Math.max(TIMELINE_START_MINUTES, Math.min(latestStart, snapped));
  return formatMinutes(clamped);
}

function addMinutes(time: string, deltaMinutes: number): string {
  return formatMinutes(parseMinutes(time) + deltaMinutes);
}

function dropPositionToStartTime(clientX: number, rect: DOMRect, durationMinutes: number): string {
  const relativeX = clientX - rect.left;
  const percent = Math.max(0, Math.min(1, relativeX / rect.width));
  const timelineMinutes = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES;
  const rawStart = TIMELINE_START_MINUTES + timelineMinutes * percent;
  const snappedStart = Math.round(rawStart / SNAP_INTERVAL_MINUTES) * SNAP_INTERVAL_MINUTES;
  const latestStart = TIMELINE_END_MINUTES - durationMinutes;
  const clampedStart = Math.max(TIMELINE_START_MINUTES, Math.min(latestStart, snappedStart));
  return formatMinutes(clampedStart);
}

function pressureLevelFor(row: CanvasRow): LanePressureLevel {
  if (row.utilization >= 100) return "critical";
  if (row.utilization >= 90) return "high";
  if (row.utilization >= 70) return "medium";
  return "low";
}

function warningLinksForRun(run: CanvasRun, warningRunKeys: Set<string>, warningBookingIds: Set<string>): boolean {
  if (warningRunKeys.has(run.tourRunKey)) return true;
  return run.bookingIds.some((bookingId) => warningBookingIds.has(bookingId));
}

export function DispatchShell({
  rows,
  groups,
  bookingLookup,
  warnings,
  selectedWarningId,
  isReadOnly,
  isEditing,
  onEditingChange,
  isMutating,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onApplyOperation,
  onGuideClick,
  onBookingClick,
  onResolveWarning,
  showCurrentTime,
}: DispatchShellProps) {
  const [filterState, setFilterState] = useState<QueueFilterState>({
    search: "",
    includeJoinRuns: true,
    includeCharters: true,
  });
  const [sortMode, setSortMode] = useState<QueueSortMode>("time");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [activeGuideDrop, setActiveGuideDrop] = useState<string | null>(null);
  const [hopperDropActive, setHopperDropActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selection, setSelection] = useState<ContextSelection>({ type: "none" });
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isQueueCollapsed, setIsQueueCollapsed] = useState(false);
  const [queueCollapsedByContext, setQueueCollapsedByContext] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1600);
  const [timelineZoom, setTimelineZoom] = useState<number>(1);

  const markers = useMemo(() => hourMarkers(), []);

  const totalGuests = useMemo(
    () => rows.reduce((sum, row) => sum + row.totalGuests, 0) + groups.reduce((sum, group) => sum + group.totalGuests, 0),
    [rows, groups]
  );
  const assignedGuests = useMemo(() => rows.reduce((sum, row) => sum + row.totalGuests, 0), [rows]);

  const rowLookup = useMemo(() => {
    const map = new Map<string, CanvasRow>();
    for (const row of rows) map.set(row.guide.id, row);
    return map;
  }, [rows]);

  const runLookup = useMemo(() => {
    const map = new Map<string, { row: CanvasRow; run: CanvasRun }>();
    for (const row of rows) {
      for (const run of row.runs) {
        map.set(run.id, { row, run });
      }
    }
    return map;
  }, [rows]);

  const bookingAssignments = useMemo(() => {
    const map = new Map<string, { guideId: string; run: CanvasRun }>();
    for (const row of rows) {
      for (const run of row.runs) {
        for (const bookingId of run.bookingIds) {
          map.set(bookingId, { guideId: row.guide.id, run });
        }
      }
    }
    return map;
  }, [rows]);

  const warningRunKeys = useMemo(
    () => new Set(warnings.map((warning) => warning.tourRunKey).filter((value): value is string => Boolean(value))),
    [warnings]
  );
  const warningBookingIds = useMemo(
    () => new Set(warnings.map((warning) => warning.bookingId).filter((value): value is string => Boolean(value))),
    [warnings]
  );

  const allWarningLinkedRunIds = useMemo(() => {
    const linked = new Set<string>();
    for (const row of rows) {
      for (const run of row.runs) {
        if (warningLinksForRun(run, warningRunKeys, warningBookingIds)) {
          linked.add(run.id);
        }
      }
    }
    return linked;
  }, [rows, warningRunKeys, warningBookingIds]);

  const selectedWarning = useMemo(() => {
    if (selection.type !== "warning") return undefined;
    return warnings.find((warning) => warning.id === selection.warningId);
  }, [selection, warnings]);

  const warningLinkedRunIds = useMemo(() => {
    if (!selectedWarning) return allWarningLinkedRunIds;

    const linked = new Set<string>();
    for (const row of rows) {
      for (const run of row.runs) {
        const runMatch = selectedWarning.tourRunKey ? run.tourRunKey === selectedWarning.tourRunKey : false;
        const bookingMatch = selectedWarning.bookingId ? run.bookingIds.includes(selectedWarning.bookingId) : false;
        if (runMatch || bookingMatch) {
          linked.add(run.id);
        }
      }
    }
    return linked;
  }, [allWarningLinkedRunIds, rows, selectedWarning]);

  const warningLinkedGuides = useMemo(() => {
    const linked = new Set<string>();
    if (selection.type === "warning" && warningLinkedRunIds.size > 0) {
      for (const row of rows) {
        if (row.runs.some((run) => warningLinkedRunIds.has(run.id))) {
          linked.add(row.guide.id);
        }
      }
      return linked;
    }

    for (const row of rows) {
      if (row.runs.some((run) => allWarningLinkedRunIds.has(run.id))) {
        linked.add(row.guide.id);
      }
    }
    return linked;
  }, [allWarningLinkedRunIds, rows, selection.type, warningLinkedRunIds]);

  const filteredGroups = useMemo(() => {
    const term = filterState.search.trim().toLowerCase();

    const base = groups.filter((group) => {
      if (!filterState.includeCharters && group.isCharter) return false;
      if (!filterState.includeJoinRuns && !group.isCharter) return false;

      if (!term) return true;
      if (group.tourName.toLowerCase().includes(term)) return true;
      if (group.tourTime.toLowerCase().includes(term)) return true;

      return group.bookings.some(
        (booking) =>
          booking.customerName.toLowerCase().includes(term) ||
          booking.referenceNumber.toLowerCase().includes(term) ||
          booking.pickupZone?.name.toLowerCase().includes(term)
      );
    });

    const sorted = [...base];
    if (sortMode === "time") {
      sorted.sort((a, b) => a.tourTime.localeCompare(b.tourTime));
    } else if (sortMode === "tour") {
      sorted.sort((a, b) => a.tourName.localeCompare(b.tourName));
    } else {
      sorted.sort((a, b) => b.totalGuests - a.totalGuests || a.tourTime.localeCompare(b.tourTime));
    }

    return sorted;
  }, [filterState, groups, sortMode]);

  const currentTimeValue = `${currentTime.getHours().toString().padStart(2, "0")}:${currentTime
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  const currentTimePercent = timeToPercent(currentTimeValue);

  const contextData = useMemo<DispatchContextData>(() => {
    const base: DispatchContextData = {
      selection,
      warningLinkedGuides,
      warningLinkedRunIds,
      warningLinkedBookingIds: warningBookingIds,
    };

    if (selection.type === "guide") {
      return {
        ...base,
        selectedGuide: rowLookup.get(selection.guideId),
      };
    }

    if (selection.type === "run") {
      const selectedRun = runLookup.get(selection.runId);
      if (!selectedRun) return base;
      return {
        ...base,
        selectedRun,
      };
    }

    if (selection.type === "booking") {
      const booking = bookingLookup.get(selection.bookingId);
      if (!booking) return base;
      const assignment = bookingAssignments.get(selection.bookingId);
      return {
        ...base,
        selectedBooking: {
          booking,
          assignedGuideId: assignment?.guideId ?? null,
          assignedRun: assignment?.run ?? null,
        },
      };
    }

    if (selection.type === "warning") {
      return {
        ...base,
        selectedWarning,
      };
    }

    return base;
  }, [
    selection,
    warningLinkedGuides,
    warningLinkedRunIds,
    warningBookingIds,
    rowLookup,
    runLookup,
    bookingLookup,
    bookingAssignments,
    selectedWarning,
  ]);

  const resetDrag = useCallback(() => {
    setDragPayload(null);
    setDragPreview(null);
    setActiveGuideDrop(null);
    setHopperDropActive(false);
  }, []);

  useEffect(() => {
    if (!showCurrentTime) return;
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, [showCurrentTime]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const isNarrowLayout = viewportWidth < 1360;

  useEffect(() => {
    if (isContextOpen && isNarrowLayout && !isQueueCollapsed) {
      setIsQueueCollapsed(true);
      setQueueCollapsedByContext(true);
    }
  }, [isContextOpen, isNarrowLayout, isQueueCollapsed]);

  useEffect(() => {
    if (!isContextOpen && queueCollapsedByContext) {
      setIsQueueCollapsed(false);
      setQueueCollapsedByContext(false);
    }
  }, [isContextOpen, queueCollapsedByContext]);

  useEffect(() => {
    if (!dragPayload) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        resetDrag();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [dragPayload, resetDrag]);

  useEffect(() => {
    if (!selectedWarningId) return;
    setSelection({ type: "warning", warningId: selectedWarningId });
  }, [selectedWarningId]);

  useEffect(() => {
    if (!dragPayload || dragPayload.source !== "guide") {
      setDragPreview(null);
    }
  }, [dragPayload]);

  const projectedGuestsForRow = useCallback(
    (row: CanvasRow): number => {
      if (!dragPayload) return row.totalGuests;
      if (dragPayload.sourceGuideId === row.guide.id) return row.totalGuests;
      return row.totalGuests + dragPayload.guestCount;
    },
    [dragPayload]
  );

  const executeOperation = useCallback(
    async (operation: DispatchOperation) => {
      await onApplyOperation(operation);
    },
    [onApplyOperation]
  );

  const violatesCharterSlotRule = useCallback(
    (
      targetRow: CanvasRow,
      bookingIds: string[],
      startTime: string | undefined,
      ignoreRunId?: string
    ): boolean => {
      if (!startTime) return false;
      const incomingIsCharter = bookingIds.some(
        (bookingId) => bookingLookup.get(bookingId)?.experienceMode === "charter"
      );
      const sameSlotRuns = targetRow.runs.filter(
        (run) => run.startTime === startTime && (!ignoreRunId || run.id !== ignoreRunId)
      );
      if (sameSlotRuns.length === 0) return false;
      const slotHasCharter = sameSlotRuns.some((run) =>
        run.bookingIds.some((bookingId) => bookingLookup.get(bookingId)?.experienceMode === "charter")
      );
      return incomingIsCharter || slotHasCharter;
    },
    [bookingLookup]
  );

  const assignBookingIdsToGuide = useCallback(
    async (bookingIds: string[], targetGuideId: string, contextLabel?: string) => {
      const targetRow = rowLookup.get(targetGuideId);
      if (!targetRow) return;
      const incomingStartTime = bookingLookup.get(bookingIds[0] ?? "")?.tourTime;

      if (violatesCharterSlotRule(targetRow, bookingIds, incomingStartTime)) {
        toast.error("Charter tours require an exclusive guide timeslot");
        return;
      }

      const deltaGuests = bookingIds.reduce((sum, bookingId) => {
        const assignment = bookingAssignments.get(bookingId);
        if (assignment?.guideId === targetGuideId) return sum;
        return sum + (bookingLookup.get(bookingId)?.guestCount ?? 0);
      }, 0);

      const projectedGuests = targetRow.totalGuests + deltaGuests;
      if (projectedGuests > targetRow.vehicleCapacity) {
        toast.error(
          `${targetRow.guide.firstName} ${targetRow.guide.lastName} would exceed capacity (${projectedGuests}/${targetRow.vehicleCapacity})`
        );
        return;
      }

      const changes: DispatchOperation["changes"] = [];
      const undoChanges: DispatchOperation["undoChanges"] = [];

      for (const bookingId of bookingIds) {
        const assignment = bookingAssignments.get(bookingId);
        if (!assignment) {
          changes.push({
            type: "assign",
            bookingId,
            toGuideId: targetGuideId,
          });
          undoChanges.push({
            type: "unassign",
            bookingIds: [bookingId],
            fromGuideId: targetGuideId,
          });
          continue;
        }

        if (assignment.guideId === targetGuideId) continue;

        changes.push({
          type: "reassign",
          bookingIds: [bookingId],
          fromGuideId: assignment.guideId,
          toGuideId: targetGuideId,
        });
        undoChanges.push({
          type: "reassign",
          bookingIds: [bookingId],
          fromGuideId: targetGuideId,
          toGuideId: assignment.guideId,
        });
      }

      if (changes.length === 0) return;

      await executeOperation({
        changes,
        undoChanges,
        description:
          contextLabel ??
          `Assigned ${changes.length} booking${changes.length === 1 ? "" : "s"} to ${targetRow.guide.firstName} ${targetRow.guide.lastName}`,
      });
    },
    [bookingAssignments, bookingLookup, executeOperation, rowLookup, violatesCharterSlotRule]
  );

  const assignBestFit = useCallback(
    async (bookingIds: string[], label: string) => {
      const candidates = rows
        .map((row) => {
          const deltaGuests = bookingIds.reduce((sum, bookingId) => {
            const assignment = bookingAssignments.get(bookingId);
            if (assignment?.guideId === row.guide.id) return sum;
            return sum + (bookingLookup.get(bookingId)?.guestCount ?? 0);
          }, 0);

          const projectedGuests = row.totalGuests + deltaGuests;
          return {
            row,
            projectedGuests,
            remainingSeats: row.vehicleCapacity - projectedGuests,
          };
        })
        .filter((candidate) => candidate.projectedGuests <= candidate.row.vehicleCapacity)
        .sort((a, b) => a.remainingSeats - b.remainingSeats || b.row.utilization - a.row.utilization);

      const best = candidates[0];
      if (!best) {
        toast.error("No guide has enough available capacity for this assignment");
        return;
      }

      await assignBookingIdsToGuide(
        bookingIds,
        best.row.guide.id,
        `Assigned ${label} to ${best.row.guide.firstName} ${best.row.guide.lastName}`
      );
    },
    [assignBookingIdsToGuide, bookingAssignments, bookingLookup, rows]
  );

  const executeDropToGuide = useCallback(
    async (targetGuideId: string, event?: React.DragEvent<HTMLDivElement>) => {
      if (!dragPayload) return;

      const targetRow = rowLookup.get(targetGuideId);
      if (!targetRow) {
        resetDrag();
        return;
      }

      const dropStartTime =
        event && dragPayload.durationMinutes
          ? dropPositionToStartTime(
              event.clientX,
              event.currentTarget.getBoundingClientRect(),
              dragPayload.durationMinutes
            )
          : dragPayload.startTime;

      if (dragPayload.source === "guide" && dragPayload.sourceGuideId === targetGuideId) {
        try {
          if (!dragPayload.startTime || !dropStartTime) return;

          if (dropStartTime === dragPayload.startTime) return;

          await executeOperation({
            changes: [
              {
                type: "time-shift",
                bookingIds: [...dragPayload.bookingIds],
                guideId: targetGuideId,
                newStartTime: dropStartTime,
              },
            ],
            undoChanges: [
              {
                type: "time-shift",
                bookingIds: [...dragPayload.bookingIds],
                guideId: targetGuideId,
                newStartTime: dragPayload.startTime,
              },
            ],
            description: `Rescheduled ${dragPayload.tourName ?? "tour"} to ${formatTimeLabel(dropStartTime)}`,
          });
        } finally {
          resetDrag();
        }
        return;
      }

      const projectedGuests =
        targetRow.totalGuests + (dragPayload.sourceGuideId === targetGuideId ? 0 : dragPayload.guestCount);
      const dropStart = dropStartTime ?? dragPayload.startTime;

      if (projectedGuests > targetRow.vehicleCapacity) {
        toast.error(
          `${targetRow.guide.firstName} ${targetRow.guide.lastName} would exceed vehicle capacity (${projectedGuests}/${targetRow.vehicleCapacity})`
        );
        resetDrag();
        return;
      }

      if (
        dragPayload.source === "guide" &&
        violatesCharterSlotRule(targetRow, dragPayload.bookingIds, dropStart, dragPayload.runId)
      ) {
        toast.error("Charter tours require an exclusive guide timeslot");
        resetDrag();
        return;
      }

      try {
        if (dragPayload.source === "hopper") {
          await assignBookingIdsToGuide(dragPayload.bookingIds, targetGuideId);
          return;
        }

        if (dragPayload.sourceGuideId) {
          const hasTimeShift =
            Boolean(dropStartTime) &&
            Boolean(dragPayload.startTime) &&
            dropStartTime !== dragPayload.startTime;

          const changes: DispatchOperation["changes"] = [
            {
              type: "reassign",
              bookingIds: [...dragPayload.bookingIds],
              fromGuideId: dragPayload.sourceGuideId,
              toGuideId: targetGuideId,
            },
          ];
          const undoChanges: DispatchOperation["undoChanges"] = [
            {
              type: "reassign",
              bookingIds: [...dragPayload.bookingIds],
              fromGuideId: targetGuideId,
              toGuideId: dragPayload.sourceGuideId,
            },
          ];

          if (hasTimeShift && dropStartTime && dragPayload.startTime) {
            changes.push({
              type: "time-shift",
              bookingIds: [...dragPayload.bookingIds],
              guideId: targetGuideId,
              newStartTime: dropStartTime,
            });
            undoChanges.unshift({
              type: "time-shift",
              bookingIds: [...dragPayload.bookingIds],
              guideId: targetGuideId,
              newStartTime: dragPayload.startTime,
            });
          }

          await executeOperation({
            changes,
            undoChanges,
            description: hasTimeShift && dropStartTime
              ? `Moved ${dragPayload.bookingIds.length} booking${dragPayload.bookingIds.length === 1 ? "" : "s"} to ${targetRow.guide.firstName} at ${formatTimeLabel(dropStartTime)}`
              : `Moved ${dragPayload.bookingIds.length} booking${dragPayload.bookingIds.length === 1 ? "" : "s"} to ${targetRow.guide.firstName}`,
          });
        }
      } finally {
        resetDrag();
      }
    },
    [assignBookingIdsToGuide, dragPayload, executeOperation, resetDrag, rowLookup, violatesCharterSlotRule]
  );

  const executeDropToHopper = useCallback(async () => {
    if (!dragPayload || dragPayload.source !== "guide" || !dragPayload.sourceGuideId) {
      resetDrag();
      return;
    }

    try {
      await executeOperation({
        changes: [
          {
            type: "unassign",
            bookingIds: [...dragPayload.bookingIds],
            fromGuideId: dragPayload.sourceGuideId,
          },
        ],
        undoChanges: dragPayload.bookingIds.map((bookingId) => ({
          type: "assign",
          bookingId,
          toGuideId: dragPayload.sourceGuideId!,
        })),
        description: `Unassigned ${dragPayload.bookingIds.length} booking${dragPayload.bookingIds.length === 1 ? "" : "s"}`,
      });
    } finally {
      resetDrag();
    }
  }, [dragPayload, executeOperation, resetDrag]);

  const handleRunNudge = useCallback(
    async (guideId: string, run: CanvasRun, deltaMinutes: number) => {
      if (!isEditing || isReadOnly || isMutating) return;
      const newStartTime = shiftStartTime(run.startTime, deltaMinutes, run.durationMinutes);
      if (newStartTime === run.startTime) return;

      await executeOperation({
        changes: [
          {
            type: "time-shift",
            bookingIds: [...run.bookingIds],
            guideId,
            newStartTime,
          },
        ],
        undoChanges: [
          {
            type: "time-shift",
            bookingIds: [...run.bookingIds],
            guideId,
            newStartTime: run.startTime,
          },
        ],
        description: `Rescheduled ${run.tourName} to ${formatTimeLabel(newStartTime)}`,
      });
    },
    [executeOperation, isEditing, isMutating, isReadOnly]
  );

  const handleMoveRun = useCallback(
    async (guideId: string, runId: string, targetGuideId: string) => {
      const selected = runLookup.get(runId);
      const targetRow = rowLookup.get(targetGuideId);
      if (!selected || !targetRow) return;

      if (violatesCharterSlotRule(targetRow, selected.run.bookingIds, selected.run.startTime, selected.run.id)) {
        toast.error("Charter tours require an exclusive guide timeslot");
        return;
      }

      const projectedGuests = targetRow.totalGuests + selected.run.guestCount;
      if (projectedGuests > targetRow.vehicleCapacity) {
        toast.error(
          `${targetRow.guide.firstName} ${targetRow.guide.lastName} would exceed capacity (${projectedGuests}/${targetRow.vehicleCapacity})`
        );
        return;
      }

      await executeOperation({
        changes: [
          {
            type: "reassign",
            bookingIds: [...selected.run.bookingIds],
            fromGuideId: guideId,
            toGuideId: targetGuideId,
          },
        ],
        undoChanges: [
          {
            type: "reassign",
            bookingIds: [...selected.run.bookingIds],
            fromGuideId: targetGuideId,
            toGuideId: guideId,
          },
        ],
        description: `Moved ${selected.run.tourName} to ${targetRow.guide.firstName} ${targetRow.guide.lastName}`,
      });
    },
    [executeOperation, rowLookup, runLookup, violatesCharterSlotRule]
  );

  const handleRescheduleRun = useCallback(
    async (guideId: string, runId: string, newStartTimeInput: string) => {
      const selected = runLookup.get(runId);
      if (!selected) return;
      const newStartTime = normalizeStartTime(newStartTimeInput, selected.run.durationMinutes);
      if (newStartTime === selected.run.startTime) return;

      await executeOperation({
        changes: [
          {
            type: "time-shift",
            bookingIds: [...selected.run.bookingIds],
            guideId,
            newStartTime,
          },
        ],
        undoChanges: [
          {
            type: "time-shift",
            bookingIds: [...selected.run.bookingIds],
            guideId,
            newStartTime: selected.run.startTime,
          },
        ],
        description: `Rescheduled ${selected.run.tourName} to ${formatTimeLabel(newStartTime)}`,
      });
    },
    [executeOperation, runLookup]
  );

  const handleReturnRunToQueue = useCallback(
    async (guideId: string, runId: string) => {
      const selected = runLookup.get(runId);
      if (!selected) return;

      await executeOperation({
        changes: [
          {
            type: "unassign",
            bookingIds: [...selected.run.bookingIds],
            fromGuideId: guideId,
          },
        ],
        undoChanges: selected.run.bookingIds.map((bookingId) => ({
          type: "assign",
          bookingId,
          toGuideId: guideId,
        })),
        description: `Returned ${selected.run.tourName} to queue`,
      });
    },
    [executeOperation, runLookup]
  );

  const autoScrollTimeline = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const scrollContainer = event.currentTarget.closest("[data-timeline-scroll='true']");
    if (!(scrollContainer instanceof HTMLElement)) return;

    const bounds = scrollContainer.getBoundingClientRect();
    if (event.clientX <= bounds.left + TIMELINE_SCROLL_EDGE_PX) {
      scrollContainer.scrollLeft = Math.max(0, scrollContainer.scrollLeft - TIMELINE_SCROLL_STEP_PX);
    } else if (event.clientX >= bounds.right - TIMELINE_SCROLL_EDGE_PX) {
      scrollContainer.scrollLeft += TIMELINE_SCROLL_STEP_PX;
    }
  }, []);

  const handleHopperDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!isEditing || isReadOnly || !dragPayload || dragPayload.source !== "guide") return;
      event.preventDefault();
      setHopperDropActive(true);
    },
    [dragPayload, isEditing, isReadOnly]
  );

  const handleHopperDragLeave = useCallback(() => {
    setHopperDropActive(false);
  }, []);

  const handleHopperDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!isEditing || isReadOnly) return;
      void executeDropToHopper();
    },
    [executeDropToHopper, isEditing, isReadOnly]
  );

  const queueCollapsed = isQueueCollapsed;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          <span className="font-medium tabular-nums text-foreground">{rows.length} guides</span>
          <span className="text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">{assignedGuests}</span>/{totalGuests} assigned
          </span>
          {groups.length > 0 && (
            <span className="font-medium text-warning">
              <span className="tabular-nums">{groups.length}</span> queue groups
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <div className="hidden items-center gap-1 rounded-md border bg-card p-1 2xl:flex">
            {TIMELINE_ZOOM_OPTIONS.map((zoomOption) => (
              <Button
                key={zoomOption.label}
                type="button"
                variant={timelineZoom === zoomOption.value ? "secondary" : "ghost"}
                size="sm"
                className="h-7 rounded px-2 text-[11px]"
                onClick={() => setTimelineZoom(zoomOption.value)}
                disabled={isMutating}
              >
                {zoomOption.label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md px-2.5"
            onClick={() => onUndo()}
            disabled={!canUndo || isMutating || isReadOnly}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md px-2.5"
            onClick={() => onRedo()}
            disabled={!canRedo || isMutating || isReadOnly}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={isEditing ? "default" : "outline"}
            className="h-8 rounded-md px-2.5"
            onClick={() => onEditingChange(!isEditing)}
            disabled={isReadOnly || isMutating}
          >
            {isReadOnly ? (
              <>
                <Lock className="mr-1.5 h-3.5 w-3.5" />
                Read Only
              </>
            ) : isEditing ? (
              "Done Editing"
            ) : (
              "Edit Assignments"
            )}
          </Button>
          <Button
            size="sm"
            variant={queueCollapsed ? "outline" : "secondary"}
            className="h-8 rounded-md px-2.5"
            onClick={() => {
              if (isNarrowLayout && isContextOpen) {
                setIsContextOpen(false);
                if (queueCollapsedByContext) {
                  setIsQueueCollapsed(false);
                }
                setQueueCollapsedByContext(false);
                return;
              }
              setQueueCollapsedByContext(false);
              setIsQueueCollapsed((prev) => !prev);
            }}
          >
            {queueCollapsed ? "Show Queue" : "Hide Queue"}
          </Button>
          <Button
            size="sm"
            variant={isContextOpen ? "secondary" : "outline"}
            className="h-8 rounded-md px-2.5"
            onClick={() => {
              const nextOpen = !isContextOpen;
              if (nextOpen && isNarrowLayout && !isQueueCollapsed) {
                setIsQueueCollapsed(true);
                setQueueCollapsedByContext(true);
              } else if (!nextOpen && queueCollapsedByContext) {
                setIsQueueCollapsed(false);
                setQueueCollapsedByContext(false);
              }
              setIsContextOpen(nextOpen);
            }}
          >
            {isContextOpen ? "Hide Context" : "Context"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {queueCollapsed ? (
          <div
            className={`relative z-40 hidden min-h-0 w-[72px] shrink-0 border-r bg-card/85 lg:flex lg:flex-col ${hopperDropActive ? "bg-primary/[0.08]" : ""}`}
            onDragOver={handleHopperDragOver}
            onDragLeave={handleHopperDragLeave}
            onDrop={handleHopperDrop}
          >
            <button
              type="button"
              className="m-2 rounded-md border bg-card px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              onClick={() => {
                setQueueCollapsedByContext(false);
                setIsQueueCollapsed(false);
              }}
            >
              Queue
            </button>
            <div className="mx-2 rounded-md border bg-card/70 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Groups</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{groups.length}</p>
            </div>
            <div className="mx-2 mt-2 rounded-md border border-dashed bg-muted/20 px-2 py-2 text-center text-[10px] text-muted-foreground">
              {hopperDropActive ? "Release to unassign" : "Drop runs here"}
            </div>
          </div>
        ) : (
          <QueuePane
            groups={filteredGroups}
            rows={rows}
            filterState={filterState}
            sortMode={sortMode}
            expandedGroups={expandedGroups}
            isEditing={isEditing}
            isReadOnly={isReadOnly}
            isMutating={isMutating}
            hopperDropActive={hopperDropActive}
            onFilterStateChange={setFilterState}
            onSortModeChange={setSortMode}
            onToggleGroup={(groupId) =>
              setExpandedGroups((prev) => {
                const next = new Set(prev);
                if (next.has(groupId)) {
                  next.delete(groupId);
                } else {
                  next.add(groupId);
                }
                return next;
              })
            }
            onBookingClick={(bookingId) => {
              setSelection({ type: "booking", bookingId });
              onBookingClick(bookingId);
            }}
            onDragStart={(payload) => {
              setDragPayload(payload);
              if (isContextOpen) setIsContextOpen(false);
            }}
            onDragEnd={resetDrag}
            onHopperDragOver={handleHopperDragOver}
            onHopperDragLeave={handleHopperDragLeave}
            onHopperDrop={handleHopperDrop}
            onAssignBestFit={(bookingIds, contextLabel) => assignBestFit(bookingIds, contextLabel)}
            onAssignToGuide={(bookingIds, guideId) => assignBookingIdsToGuide(bookingIds, guideId)}
          />
        )}

        <div className="relative z-0 min-w-0 flex-1">
          <TimelinePane
            rows={rows}
            markers={markers}
            timelineZoom={timelineZoom}
            showCurrentTime={showCurrentTime}
            currentTimeLabel={currentTimeValue}
            currentTimePercent={currentTimePercent}
            dragPayload={dragPayload}
            dragPreview={dragPreview}
            activeGuideDrop={activeGuideDrop}
            projectedGuestsForRow={projectedGuestsForRow}
            pressureForRow={pressureLevelFor}
            isEditing={isEditing}
            isReadOnly={isReadOnly}
            isMutating={isMutating}
            selectedRunId={selection.type === "run" ? selection.runId : null}
            warningLinkedRunIds={warningLinkedRunIds}
            onGuideClick={(guideId) => {
              onGuideClick(guideId);
              setSelection({ type: "guide", guideId });
            }}
            onLaneDragOver={(guideId, event) => {
              if (!isEditing || isReadOnly || !dragPayload) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              autoScrollTimeline(event);
              setActiveGuideDrop(guideId);
              if (
                dragPayload.source === "guide" &&
                dragPayload.durationMinutes &&
                dragPayload.startTime
              ) {
                const startTime = dropPositionToStartTime(
                  event.clientX,
                  event.currentTarget.getBoundingClientRect(),
                  dragPayload.durationMinutes
                );
                setDragPreview({
                  guideId,
                  startTime,
                  endTime: addMinutes(startTime, dragPayload.durationMinutes),
                  leftPercent: timeToPercent(startTime),
                  widthPercent: Math.max(durationToPercent(dragPayload.durationMinutes), 2),
                });
              } else {
                setDragPreview(null);
              }
            }}
            onLaneDragLeave={(guideId, event) => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              const rect = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX >= rect.left &&
                event.clientX <= rect.right &&
                event.clientY >= rect.top &&
                event.clientY <= rect.bottom
              ) {
                return;
              }
              if (activeGuideDrop === guideId) setActiveGuideDrop(null);
              if (dragPreview?.guideId === guideId) setDragPreview(null);
            }}
            onLaneDrop={(guideId, event) => {
              event.preventDefault();
              setDragPreview(null);
              if (!isEditing || isReadOnly) return;
              void executeDropToGuide(guideId, event);
            }}
            onRunClick={(guideId, run) => {
              setSelection({ type: "run", guideId, runId: run.id });
            }}
            onRunDragStart={(guideId, run) => {
              if (isContextOpen && isNarrowLayout) {
                setIsContextOpen(false);
                if (queueCollapsedByContext) {
                  setIsQueueCollapsed(false);
                  setQueueCollapsedByContext(false);
                }
              }
              setDragPayload({
                source: "guide",
                sourceGuideId: guideId,
                bookingIds: [...run.bookingIds],
                guestCount: run.guestCount,
                runId: run.id,
                tourName: run.tourName,
                startTime: run.startTime,
                durationMinutes: run.durationMinutes,
              });
            }}
            onRunDragEnd={resetDrag}
            onRunNudge={(guideId, run, deltaMinutes) => {
              void handleRunNudge(guideId, run, deltaMinutes);
            }}
          />

          {isContextOpen && (
            <div
              className={`pointer-events-none absolute inset-y-2 right-2 z-30 2xl:hidden ${
                isNarrowLayout ? "w-[min(72vw,280px)]" : "w-[min(82vw,304px)]"
              }`}
            >
              <div className="pointer-events-auto h-full">
                <ContextPane
                  context={contextData}
                  rows={rows}
                  warningsCount={warnings.length}
                  unassignedGroupsCount={groups.length}
                  isEditing={isEditing}
                  isReadOnly={isReadOnly}
                  isMutating={isMutating}
                  onAssignBooking={(bookingId, guideId) => assignBookingIdsToGuide([bookingId], guideId)}
                  onAssignBookingBestFit={(bookingId) => assignBestFit([bookingId], "booking")}
                  onMoveRun={handleMoveRun}
                  onRescheduleRun={handleRescheduleRun}
                  onReturnRunToQueue={handleReturnRunToQueue}
                  onResolveWarning={onResolveWarning}
                  onClearSelection={() => setSelection({ type: "none" })}
                  onClose={() => setIsContextOpen(false)}
                />
              </div>
            </div>
          )}
        </div>

        {isContextOpen && (
          <div className="hidden 2xl:block 2xl:w-[280px] 2xl:shrink-0 2xl:border-l 2xl:bg-card/35 2xl:p-2">
            <ContextPane
              context={contextData}
              rows={rows}
              warningsCount={warnings.length}
              unassignedGroupsCount={groups.length}
              isEditing={isEditing}
              isReadOnly={isReadOnly}
              isMutating={isMutating}
              onAssignBooking={(bookingId, guideId) => assignBookingIdsToGuide([bookingId], guideId)}
              onAssignBookingBestFit={(bookingId) => assignBestFit([bookingId], "booking")}
              onMoveRun={handleMoveRun}
              onRescheduleRun={handleRescheduleRun}
              onReturnRunToQueue={handleReturnRunToQueue}
              onResolveWarning={onResolveWarning}
              onClearSelection={() => setSelection({ type: "none" })}
              onClose={() => setIsContextOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
