"use client";

import { useMemo } from "react";
import { Search, GripVertical, ChevronDown, ChevronUp, WandSparkles, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CanvasRow, HopperGroup } from "../dispatch-model";
import type { QueueFilterState, QueueSortMode, DragPayload } from "./canvas-types";

interface QueuePaneProps {
  groups: HopperGroup[];
  rows: CanvasRow[];
  filterState: QueueFilterState;
  sortMode: QueueSortMode;
  expandedGroups: Set<string>;
  isEditing: boolean;
  isReadOnly: boolean;
  isMutating: boolean;
  hopperDropActive: boolean;
  onFilterStateChange: (next: QueueFilterState) => void;
  onSortModeChange: (next: QueueSortMode) => void;
  onToggleGroup: (groupId: string) => void;
  onBookingClick: (bookingId: string) => void;
  onDragStart: (payload: DragPayload) => void;
  onDragEnd: () => void;
  onHopperDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onHopperDragLeave: () => void;
  onHopperDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onAssignBestFit: (bookingIds: string[], contextLabel: string) => Promise<void>;
  onAssignToGuide: (bookingIds: string[], guideId: string) => Promise<void>;
}

function groupLabel(group: HopperGroup): string {
  if (group.isCharter) {
    return "Charter";
  }
  return `${group.totalBookings} bookings`;
}

export function QueuePane({
  groups,
  rows,
  filterState,
  sortMode,
  expandedGroups,
  isEditing,
  isReadOnly,
  isMutating,
  hopperDropActive,
  onFilterStateChange,
  onSortModeChange,
  onToggleGroup,
  onBookingClick,
  onDragStart,
  onDragEnd,
  onHopperDragOver,
  onHopperDragLeave,
  onHopperDrop,
  onAssignBestFit,
  onAssignToGuide,
}: QueuePaneProps) {
  const canEdit = isEditing && !isReadOnly && !isMutating;
  const totalBookings = useMemo(
    () => groups.reduce((sum, group) => sum + group.totalBookings, 0),
    [groups]
  );
  const totalGuests = useMemo(
    () => groups.reduce((sum, group) => sum + group.totalGuests, 0),
    [groups]
  );
  const sortOptions: Array<{ mode: QueueSortMode; label: string }> = [
    { mode: "time", label: "Time" },
    { mode: "tour", label: "Tour" },
    { mode: "guests", label: "Guests" },
  ];

  return (
    <div
      className={cn(
        "relative z-40 hidden min-h-0 w-[248px] shrink-0 overflow-x-hidden border-r bg-card/85 xl:w-[260px] 2xl:w-[272px] lg:flex lg:flex-col",
        hopperDropActive && "bg-primary/[0.08]"
      )}
      onDragOver={onHopperDragOver}
      onDragLeave={onHopperDragLeave}
      onDrop={onHopperDrop}
    >
      <div className="space-y-2 border-b bg-card/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Unassigned Queue</h2>
            <p className="text-xs text-muted-foreground">Drag groups into guide lanes</p>
          </div>
          <Badge variant="outline" className="h-6 shrink-0 rounded-full px-2 text-xs">
            {groups.length} groups
          </Badge>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="h-7 shrink-0 rounded-full px-2.5 text-[11px] tabular-nums">
            Groups {groups.length}
          </Badge>
          <Badge variant="outline" className="h-7 shrink-0 rounded-full px-2.5 text-[11px] tabular-nums">
            Bookings {totalBookings}
          </Badge>
          <Badge variant="outline" className="h-7 shrink-0 rounded-full px-2.5 text-[11px] tabular-nums">
            Guests {totalGuests}
          </Badge>
        </div>

        {canEdit && (
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-xs transition-colors",
              hopperDropActive
                ? "border-primary/45 bg-primary/10 text-primary"
                : "border-dashed border-border bg-muted/20 text-muted-foreground"
            )}
          >
            {hopperDropActive ? "Release to return run to queue" : "Drop assigned runs here to unassign"}
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterState.search}
            onChange={(event) =>
              onFilterStateChange({
                ...filterState,
                search: event.target.value,
              })
            }
            placeholder="Search name, tour, zone..."
            className="h-9 pl-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <div className="rounded-md border bg-muted/30 p-1">
            <span className="inline-flex items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground">
              <Filter className="h-3 w-3" />
              Sort
            </span>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {sortOptions.map((option) => (
                <Button
                  key={option.mode}
                  variant={sortMode === option.mode ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 min-w-0 rounded px-1.5 text-[11px]"
                  onClick={() => onSortModeChange(option.mode)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <Button
              variant={filterState.includeJoinRuns ? "secondary" : "outline"}
              size="sm"
              className="h-7 w-full min-w-0 rounded-full px-2 text-[11px]"
              onClick={() =>
                onFilterStateChange({
                  ...filterState,
                  includeJoinRuns: !filterState.includeJoinRuns,
                })
              }
            >
              Shared
            </Button>
            <Button
              variant={filterState.includeCharters ? "secondary" : "outline"}
              size="sm"
              className="h-7 w-full min-w-0 rounded-full px-2 text-[11px]"
              onClick={() =>
                onFilterStateChange({
                  ...filterState,
                  includeCharters: !filterState.includeCharters,
                })
              }
            >
              Charter
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        {groups.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            All bookings are assigned.
          </div>
        )}

        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          return (
            <div
              key={group.id}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-card shadow-sm transition-colors duration-150",
                group.isCharter && "border-warning/45 bg-warning/[0.06]",
                canEdit && "hover:border-primary/35 hover:shadow-md"
              )}
              draggable={canEdit}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", group.id);
                onDragStart({
                  source: "hopper",
                  sourceGuideId: null,
                  bookingIds: group.bookings.map((booking) => booking.id),
                  guestCount: group.totalGuests,
                });
              }}
              onDragEnd={onDragEnd}
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  group.isCharter ? "bg-warning" : "bg-primary/70"
                )}
              />

              <div className="px-3 py-3 pl-4">
                <button
                  type="button"
                  className="flex min-w-0 w-full items-start gap-2 text-left"
                  onClick={() => onToggleGroup(group.id)}
                >
                  <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-1.5">
                      <span
                        className="min-w-0 flex-1 line-clamp-2 text-[15px] font-semibold leading-tight"
                        title={group.tourName}
                      >
                        {group.tourName}
                      </span>
                      <Badge variant="outline" className="h-6 shrink-0 rounded-full px-2 text-[11px]">
                        {group.tourTime}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{groupLabel(group)}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="tabular-nums">{group.totalGuests} guests</span>
                      {group.isCharter && (
                        <Badge
                          variant="outline"
                          className="h-5 shrink-0 rounded-full border-warning/40 bg-warning/10 px-1.5 text-[10px] text-warning"
                        >
                          Charter
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {canEdit && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 gap-1.5 rounded-full px-2.5 text-[11px]"
                      onClick={() =>
                        void onAssignBestFit(group.bookings.map((booking) => booking.id), group.tourName)
                      }
                    >
                      <WandSparkles className="h-3 w-3" />
                      Best Fit
                    </Button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="space-y-1.5 border-t bg-muted/20 px-3 py-2.5 pl-4">
                  {group.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col gap-2 rounded-lg border bg-card/80 px-2 py-1.5 transition-colors hover:border-primary/25 hover:bg-card"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                        onClick={() => onBookingClick(booking.id)}
                        draggable={canEdit}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", booking.id);
                          onDragStart({
                            source: "hopper",
                            sourceGuideId: null,
                            bookingIds: [booking.id],
                            guestCount: booking.guestCount,
                          });
                        }}
                        onDragEnd={onDragEnd}
                      >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground" title={booking.customerName}>
                            {booking.customerName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {booking.referenceNumber}
                            {booking.pickupZone?.name ? ` • ${booking.pickupZone.name}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="h-5 shrink-0 rounded-full px-1.5 text-[10px] tabular-nums">
                          {booking.guestCount}p
                        </Badge>
                      </button>

                      {canEdit && (
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-full px-2 text-[11px]"
                            onClick={() => void onAssignBestFit([booking.id], booking.customerName)}
                          >
                            Best
                          </Button>
                          <select
                            aria-label={`Assign ${booking.customerName}`}
                            className="h-7 min-w-[6rem] rounded-full border bg-background px-2 text-[11px] text-foreground"
                            defaultValue=""
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              const targetGuideId = event.target.value;
                              event.currentTarget.value = "";
                              if (!targetGuideId) return;
                              void onAssignToGuide([booking.id], targetGuideId);
                            }}
                          >
                            <option value="">Assign</option>
                            {rows.map((row) => (
                              <option key={`${booking.id}_${row.guide.id}`} value={row.guide.id}>
                                {row.guide.firstName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
