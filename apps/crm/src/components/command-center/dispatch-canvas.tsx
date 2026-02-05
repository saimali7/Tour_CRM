"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Users, Undo2, Redo2, Lock, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RouterInputs } from "@/lib/trpc";
import type { CanvasRow, HopperGroup } from "./dispatch-model";
import type { GuestCardBooking } from "./guest-card";
import {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  durationToPercent,
  formatTimeDisplay,
  timeToPercent,
} from "./timeline/timeline-utils";

type BatchChange = RouterInputs["commandCenter"]["batchApplyChanges"]["changes"][number];

interface DispatchOperation {
  changes: BatchChange[];
  undoChanges: BatchChange[];
  description: string;
}

interface DragPayload {
  source: "hopper" | "guide";
  sourceGuideId: string | null;
  bookingIds: string[];
  guestCount: number;
}

interface DispatchCanvasProps {
  rows: CanvasRow[];
  groups: HopperGroup[];
  bookingLookup: Map<string, GuestCardBooking>;
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
  showCurrentTime: boolean;
}
const GUIDE_COLUMN_WIDTH = 220;

const confidenceClass: Record<CanvasRow["runs"][number]["confidence"], string> = {
  optimal: "border-success/60 bg-success/15 text-success",
  good: "border-info/60 bg-info/15 text-info",
  review: "border-warning/60 bg-warning/15 text-warning",
  problem: "border-destructive/60 bg-destructive/15 text-destructive",
};

function hourMarkers(): Array<{ time: string; label: string; left: number }> {
  const markers: Array<{ time: string; label: string; left: number }> = [];
  for (let hour = TIMELINE_START_HOUR; hour <= TIMELINE_END_HOUR; hour += 1) {
    const time = `${hour.toString().padStart(2, "0")}:00`;
    markers.push({
      time,
      label: formatTimeDisplay(time),
      left: timeToPercent(time),
    });
  }
  return markers;
}

function groupLabel(group: HopperGroup): string {
  if (group.isCharter) {
    return "Charter";
  }
  return `${group.totalBookings} bookings`;
}

function buildGuestCount(bookingIds: string[], bookingLookup: Map<string, GuestCardBooking>): number {
  return bookingIds.reduce((sum, bookingId) => sum + (bookingLookup.get(bookingId)?.guestCount ?? 0), 0);
}

export function DispatchCanvas({
  rows,
  groups,
  bookingLookup,
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
  showCurrentTime,
}: DispatchCanvasProps) {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [activeGuideDrop, setActiveGuideDrop] = useState<string | null>(null);
  const [hopperDropActive, setHopperDropActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const markers = useMemo(() => hourMarkers(), []);
  const totalGuests = useMemo(
    () => rows.reduce((sum, row) => sum + row.totalGuests, 0) + groups.reduce((sum, group) => sum + group.totalGuests, 0),
    [rows, groups]
  );
  const assignedGuests = useMemo(() => rows.reduce((sum, row) => sum + row.totalGuests, 0), [rows]);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => {
      if (group.tourName.toLowerCase().includes(term)) return true;
      if (group.tourTime.toLowerCase().includes(term)) return true;
      return group.bookings.some(
        (booking) =>
          booking.customerName.toLowerCase().includes(term) ||
          booking.referenceNumber.toLowerCase().includes(term) ||
          booking.pickupZone?.name.toLowerCase().includes(term)
      );
    });
  }, [groups, search]);

  const resetDrag = useCallback(() => {
    setDragPayload(null);
    setActiveGuideDrop(null);
    setHopperDropActive(false);
  }, []);

  useEffect(() => {
    if (!showCurrentTime) return;
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, [showCurrentTime]);

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

  const currentTimeValue = `${currentTime.getHours().toString().padStart(2, "0")}:${currentTime
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  const currentTimePercent = timeToPercent(currentTimeValue);

  const projectedGuestsForRow = useCallback(
    (row: CanvasRow): number => {
      if (!dragPayload) return row.totalGuests;
      if (dragPayload.sourceGuideId === row.guide.id) return row.totalGuests;
      return row.totalGuests + dragPayload.guestCount;
    },
    [dragPayload]
  );

  const executeDropToGuide = async (targetGuideId: string) => {
    if (!dragPayload) return;
    if (dragPayload.source === "guide" && dragPayload.sourceGuideId === targetGuideId) {
      resetDrag();
      return;
    }

    const targetRow = rows.find((row) => row.guide.id === targetGuideId);
    if (!targetRow) {
      resetDrag();
      return;
    }

    const projectedGuests =
      targetRow.totalGuests +
      (dragPayload.sourceGuideId === targetGuideId ? 0 : dragPayload.guestCount);

    if (projectedGuests > targetRow.vehicleCapacity) {
      toast.error(
        `${targetRow.guide.firstName} ${targetRow.guide.lastName} would exceed vehicle capacity (${projectedGuests}/${targetRow.vehicleCapacity})`
      );
      resetDrag();
      return;
    }

    try {
      let changes: BatchChange[] = [];
      let undoChanges: BatchChange[] = [];
      let description = "";

      if (dragPayload.source === "hopper") {
        changes = dragPayload.bookingIds.map((bookingId) => ({
          type: "assign",
          bookingId,
          toGuideId: targetGuideId,
        }));

        undoChanges = [
          {
            type: "unassign",
            bookingIds: [...dragPayload.bookingIds],
            fromGuideId: targetGuideId,
          },
        ];

        description = `Assigned ${dragPayload.bookingIds.length} booking${dragPayload.bookingIds.length === 1 ? "" : "s"}`;
      } else if (dragPayload.sourceGuideId) {
        changes = [
          {
            type: "reassign",
            bookingIds: [...dragPayload.bookingIds],
            fromGuideId: dragPayload.sourceGuideId,
            toGuideId: targetGuideId,
          },
        ];

        undoChanges = [
          {
            type: "reassign",
            bookingIds: [...dragPayload.bookingIds],
            fromGuideId: targetGuideId,
            toGuideId: dragPayload.sourceGuideId,
          },
        ];

        description = `Moved ${dragPayload.bookingIds.length} booking${dragPayload.bookingIds.length === 1 ? "" : "s"} to ${targetRow.guide.firstName}`;
      }

      if (changes.length > 0) {
        await onApplyOperation({ changes, undoChanges, description });
      }
    } finally {
      resetDrag();
    }
  };

  const executeDropToHopper = async () => {
    if (!dragPayload || dragPayload.source !== "guide" || !dragPayload.sourceGuideId) {
      resetDrag();
      return;
    }

    try {
      const changes: BatchChange[] = [
        {
          type: "unassign",
          bookingIds: [...dragPayload.bookingIds],
          fromGuideId: dragPayload.sourceGuideId,
        },
      ];

      const undoChanges: BatchChange[] = dragPayload.bookingIds.map((bookingId) => ({
        type: "assign",
        bookingId,
        toGuideId: dragPayload.sourceGuideId!,
      }));

      await onApplyOperation({
        changes,
        undoChanges,
        description: `Unassigned ${dragPayload.bookingIds.length} booking${dragPayload.bookingIds.length === 1 ? "" : "s"}`,
      });
    } finally {
      resetDrag();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-4 text-sm">
          <span>
            <span className="font-semibold tabular-nums">{rows.length}</span>
            <span className="text-muted-foreground"> guides</span>
          </span>
          <span>
            <span className="font-semibold tabular-nums">{assignedGuests}</span>
            <span className="text-muted-foreground">/{totalGuests} guests assigned</span>
          </span>
          {groups.length > 0 && (
            <span className="text-warning">
              <span className="font-semibold tabular-nums">{groups.length}</span>
              <span> unassigned groups</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onUndo()} disabled={!canUndo || isMutating || isReadOnly}>
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onRedo()} disabled={!canRedo || isMutating || isReadOnly}>
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={isEditing ? "default" : "outline"}
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
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div
          className={cn(
            "hidden w-80 shrink-0 border-r lg:flex lg:flex-col",
            hopperDropActive && "bg-primary/5"
          )}
          onDragOver={(event) => {
            if (!isEditing || isReadOnly || !dragPayload || dragPayload.source !== "guide") return;
            event.preventDefault();
            setHopperDropActive(true);
          }}
          onDragLeave={() => setHopperDropActive(false)}
          onDrop={async (event) => {
            event.preventDefault();
            if (!isEditing || isReadOnly) return;
            await executeDropToHopper();
          }}
        >
          <div className="border-b px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, tour, zone..."
                className="h-8 pl-8"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {filteredGroups.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                {groups.length === 0 ? "All bookings are assigned." : "No groups match your search."}
              </div>
            )}

            {filteredGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              const canDrag = isEditing && !isReadOnly && !isMutating;
              return (
                <div
                  key={group.id}
                  className={cn(
                    "rounded-lg border bg-card transition-colors",
                    group.isCharter && "border-warning/40 bg-warning/5",
                    canDrag && "hover:border-primary/30"
                  )}
                  draggable={canDrag}
                  onDragStart={() => {
                    const bookingIds = group.bookings.map((booking) => booking.id);
                    setDragPayload({
                      source: "hopper",
                      sourceGuideId: null,
                      bookingIds,
                      guestCount: buildGuestCount(bookingIds, bookingLookup),
                    });
                  }}
                  onDragEnd={resetDrag}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left"
                    onClick={() => {
                      const next = new Set(expandedGroups);
                      if (next.has(group.id)) {
                        next.delete(group.id);
                      } else {
                        next.add(group.id);
                      }
                      setExpandedGroups(next);
                    }}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{group.tourName}</span>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          {group.tourTime}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{groupLabel(group)}</span>
                        <span className="text-muted-foreground/60">•</span>
                        <span className="tabular-nums">{group.totalGuests} guests</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="space-y-1 border-t px-3 py-2">
                      {group.bookings.map((booking) => {
                        const bookingIds = [booking.id];
                        return (
                          <div
                            key={booking.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                          >
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-center justify-between text-left"
                              onClick={() => onBookingClick(booking.id)}
                              draggable={canDrag}
                              onDragStart={() => {
                                setDragPayload({
                                  source: "hopper",
                                  sourceGuideId: null,
                                  bookingIds,
                                  guestCount: booking.guestCount,
                                });
                              }}
                              onDragEnd={resetDrag}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm">{booking.customerName}</p>
                                <p className="text-[11px] text-muted-foreground">{booking.referenceNumber}</p>
                              </div>
                              <span className="text-xs tabular-nums text-muted-foreground">{booking.guestCount}p</span>
                            </button>

                            {canDrag && (
                              <select
                                aria-label={`Assign ${booking.customerName}`}
                                className="h-7 w-24 rounded-md border bg-background px-2 text-xs text-foreground"
                                defaultValue=""
                                onClick={(event) => event.stopPropagation()}
                                onChange={async (event) => {
                                  const targetGuideId = event.target.value;
                                  event.currentTarget.value = "";
                                  if (!targetGuideId) return;

                                  const targetRow = rows.find((row) => row.guide.id === targetGuideId);
                                  if (!targetRow) return;

                                  const projectedGuests = targetRow.totalGuests + booking.guestCount;
                                  if (projectedGuests > targetRow.vehicleCapacity) {
                                    toast.error(
                                      `${targetRow.guide.firstName} ${targetRow.guide.lastName} would exceed capacity (${projectedGuests}/${targetRow.vehicleCapacity})`
                                    );
                                    return;
                                  }

                                  await onApplyOperation({
                                    changes: [
                                      {
                                        type: "assign",
                                        bookingId: booking.id,
                                        toGuideId: targetGuideId,
                                      },
                                    ],
                                    undoChanges: [
                                      {
                                        type: "unassign",
                                        bookingIds: [booking.id],
                                        fromGuideId: targetGuideId,
                                      },
                                    ],
                                    description: `Assigned ${booking.customerName} to ${targetRow.guide.firstName} ${targetRow.guide.lastName}`,
                                  });
                                }}
                              >
                                <option value="">Assign</option>
                                {rows.map((row) => (
                                  <option key={`${booking.id}_${row.guide.id}`} value={row.guide.id}>
                                    {row.guide.firstName}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
            <div className="flex h-9">
              <div className="shrink-0 border-r" style={{ width: GUIDE_COLUMN_WIDTH }} />
              <div className="relative flex-1">
                {markers.map((marker) => (
                  <div
                    key={marker.time}
                    className="absolute top-0 bottom-0 border-l border-border/40"
                    style={{ left: `${marker.left}%` }}
                  >
                    <span className="ml-1 mt-1 inline-block text-[11px] text-muted-foreground">{marker.label}</span>
                  </div>
                ))}
                {showCurrentTime && (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-20 border-l border-destructive/70"
                    style={{ left: `${currentTimePercent}%` }}
                  >
                    <span className="absolute -top-0.5 -translate-x-1/2 rounded bg-destructive px-1 py-0.5 text-[10px] font-medium text-destructive-foreground">
                      {formatTimeDisplay(currentTimeValue)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {rows.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No available guides for this date.</div>
          )}

          {rows.map((row) => {
            const projectedGuests = projectedGuestsForRow(row);
            const willExceedCapacity = dragPayload ? projectedGuests > row.vehicleCapacity : false;
            const isActiveDrop = activeGuideDrop === row.guide.id;

            return (
            <div key={row.guide.id} className="flex min-h-[82px] border-b">
              <button
                type="button"
                className="flex w-[220px] shrink-0 items-center gap-3 border-r px-3 text-left hover:bg-muted/30"
                onClick={() => onGuideClick(row.guide.id)}
              >
                <UserAvatar
                  name={`${row.guide.firstName} ${row.guide.lastName}`}
                  src={row.guide.avatarUrl ?? undefined}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.guide.firstName} {row.guide.lastName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span className="tabular-nums">
                      {row.totalGuests}/{row.vehicleCapacity}
                    </span>
                    <span>•</span>
                    <span className="tabular-nums">{row.utilization}%</span>
                  </div>
                </div>
              </button>

              <div
                className={cn(
                  "relative flex-1",
                  isActiveDrop && !willExceedCapacity && "bg-primary/5",
                  isActiveDrop && willExceedCapacity && "bg-destructive/5"
                )}
                onDragOver={(event) => {
                  if (!isEditing || isReadOnly || !dragPayload) return;
                  event.preventDefault();
                  setActiveGuideDrop(row.guide.id);
                }}
                onDragLeave={() => {
                  if (activeGuideDrop === row.guide.id) setActiveGuideDrop(null);
                }}
                onDrop={async (event) => {
                  event.preventDefault();
                  if (!isEditing || isReadOnly) return;
                  await executeDropToGuide(row.guide.id);
                }}
              >
                <div className="absolute inset-0">
                  {markers.map((marker) => (
                    <div
                      key={`${row.guide.id}_${marker.time}`}
                      className="absolute top-0 bottom-0 border-l border-border/30"
                      style={{ left: `${marker.left}%` }}
                    />
                  ))}
                </div>

                {row.runs.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    No assignments
                  </div>
                )}

                {row.runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    className={cn(
                      "absolute top-2 bottom-2 rounded-md border px-2 text-left shadow-sm transition-all",
                      confidenceClass[run.confidence],
                      isEditing && !isReadOnly && "cursor-grab active:cursor-grabbing hover:shadow-md"
                    )}
                    style={{
                      left: `${timeToPercent(run.startTime)}%`,
                      width: `${Math.max(durationToPercent(run.durationMinutes), 2)}%`,
                      minWidth: "130px",
                    }}
                    draggable={isEditing && !isReadOnly && !isMutating}
                    onDragStart={() => {
                      setDragPayload({
                        source: "guide",
                        sourceGuideId: row.guide.id,
                        bookingIds: [...run.bookingIds],
                        guestCount: buildGuestCount(run.bookingIds, bookingLookup),
                      });
                    }}
                    onDragEnd={resetDrag}
                    onClick={() => {
                      const firstBookingId = run.bookingIds[0];
                      if (firstBookingId) onBookingClick(firstBookingId);
                    }}
                  >
                    <div className="flex h-full flex-col justify-between">
                      <div className="truncate text-xs font-semibold">{run.tourName}</div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="tabular-nums">{run.guestCount} guests</span>
                        <span>{run.bookingIds.length} bookings</span>
                      </div>
                    </div>
                  </button>
                ))}

                {isActiveDrop && dragPayload && (
                  <div
                    className={cn(
                      "pointer-events-none absolute right-2 top-2 z-20 rounded px-1.5 py-1 text-[10px] font-medium",
                      willExceedCapacity
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {projectedGuests}/{row.vehicleCapacity} seats
                  </div>
                )}
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
