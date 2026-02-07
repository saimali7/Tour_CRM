"use client";

import { useMemo, type CSSProperties } from "react";
import { Search, GripVertical, ChevronDown, ChevronUp, WandSparkles, Clock3 } from "lucide-react";
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

function tourHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function parseTourHour(tourTime: string): number | null {
  const value = tourTime.trim().toUpperCase();
  const amPmMatch = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (amPmMatch) {
    const hour = Number(amPmMatch[1]);
    const period = amPmMatch[3];
    if (Number.isNaN(hour)) return null;
    if (period === "AM") return hour === 12 ? 0 : hour;
    return hour === 12 ? 12 : hour + 12;
  }

  const hhmmMatch = value.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const hour = Number(hhmmMatch[1]);
    if (Number.isNaN(hour)) return null;
    return Math.max(0, Math.min(23, hour));
  }

  return null;
}

type TimeBand = "early" | "morning" | "midday" | "afternoon" | "evening" | "night";

function getTimeBand(tourTime: string): TimeBand {
  const hour = parseTourHour(tourTime);
  if (hour === null) return "midday";
  if (hour < 8) return "early";
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  if (hour < 20) return "evening";
  return "night";
}

const timeBandClass: Record<TimeBand, string> = {
  early: "border-cyan-500/35 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
  morning: "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  midday: "border-sky-500/35 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  afternoon: "border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  evening: "border-violet-500/35 bg-violet-500/12 text-violet-700 dark:text-violet-300",
  night: "border-indigo-500/35 bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
};

const timeBandLabel: Record<TimeBand, string> = {
  early: "Early",
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

const sortOptions: Array<{ mode: QueueSortMode; label: string }> = [
  { mode: "time", label: "Time" },
  { mode: "tour", label: "Tour" },
  { mode: "guests", label: "Size" },
];

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
  const assignableRows = useMemo(
    () => rows.filter((row) => !row.isOutsourced),
    [rows]
  );

  return (
    <div
      className={cn(
        "relative z-40 hidden min-h-0 w-[200px] shrink-0 overflow-x-hidden border-r bg-card/85 xl:w-[208px] 2xl:w-[216px] lg:flex lg:flex-col",
        hopperDropActive && "bg-primary/[0.08]"
      )}
      onDragOver={onHopperDragOver}
      onDragLeave={onHopperDragLeave}
      onDrop={onHopperDrop}
    >
      {/* Compact header: search + sort pills + filter toggles */}
      <div className="space-y-1.5 border-b bg-card/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterState.search}
            onChange={(event) =>
              onFilterStateChange({
                ...filterState,
                search: event.target.value,
              })
            }
            placeholder="Search..."
            className="h-8 pl-7 text-xs"
          />
        </div>

        <div className="flex items-center gap-1">
          {sortOptions.map((option) => (
            <button
              key={option.mode}
              type="button"
              className={cn(
                "h-6 flex-1 rounded-md px-1 text-[10px] font-medium transition-colors",
                sortMode === option.mode
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
              onClick={() => onSortModeChange(option.mode)}
            >
              {option.label}
            </button>
          ))}

          <span className="mx-0.5 h-4 w-px bg-border" />

          <button
            type="button"
            className={cn(
              "h-6 rounded-md px-1.5 text-[10px] font-medium transition-colors",
              filterState.includeJoinRuns
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground/60 line-through"
            )}
            onClick={() =>
              onFilterStateChange({
                ...filterState,
                includeJoinRuns: !filterState.includeJoinRuns,
              })
            }
            title="Toggle shared tours"
          >
            S
          </button>
          <button
            type="button"
            className={cn(
              "h-6 rounded-md px-1.5 text-[10px] font-medium transition-colors",
              filterState.includeCharters
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground/60 line-through"
            )}
            onClick={() =>
              onFilterStateChange({
                ...filterState,
                includeCharters: !filterState.includeCharters,
              })
            }
            title="Toggle charter tours"
          >
            C
          </button>
        </div>
      </div>

      {/* Queue groups */}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {groups.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            All assigned
          </div>
        )}

        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const hue = tourHue(`${group.tourName}|${group.tourTime}`);
          const accentColor = `hsl(${hue} 78% 52%)`;
          const accentTint = `hsl(${hue} 82% 52% / 0.10)`;
          const band = getTimeBand(group.tourTime);
          const cardStyle: CSSProperties = {
            backgroundImage: `linear-gradient(90deg, ${accentTint} 0%, transparent 45%)`,
          };
          return (
            <div
              key={group.id}
              className={cn(
                "group relative overflow-hidden rounded-lg border bg-card shadow-sm transition-colors duration-150",
                group.isCharter && "border-warning/45",
                canEdit && "hover:border-primary/35 hover:shadow-md"
              )}
              style={cardStyle}
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
                  group.isCharter ? "bg-warning" : ""
                )}
                style={!group.isCharter ? { backgroundColor: accentColor } : undefined}
              />

              <div className="px-2 py-2 pl-3">
                <button
                  type="button"
                  className="flex min-w-0 w-full items-start gap-1.5 text-left"
                  onClick={() => onToggleGroup(group.id)}
                >
                  <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-1">
                      <div className="min-w-0 flex flex-1 items-start gap-1.5">
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: accentColor }}
                          aria-hidden="true"
                        />
                        <span
                          className="min-w-0 flex-1 line-clamp-2 text-[13px] font-semibold leading-tight"
                          title={group.tourName}
                        >
                          {group.tourName}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("h-5 shrink-0 rounded-full px-1.5 text-[10px] tabular-nums", timeBandClass[band])}
                      >
                        <Clock3 className="mr-0.5 h-2.5 w-2.5" />
                        {group.tourTime}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 font-medium", timeBandClass[band])}>
                        {timeBandLabel[band]}
                      </span>
                      <span>{groupLabel(group)}</span>
                      <span className="text-muted-foreground/60">&middot;</span>
                      <span className="tabular-nums">{group.totalGuests}p</span>
                      {group.isCharter && (
                        <Badge
                          variant="outline"
                          className="h-4 shrink-0 rounded-full border-warning/40 bg-warning/10 px-1 text-[9px] text-warning"
                        >
                          Charter
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {canEdit && (
                  <div className="mt-1.5 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-6 gap-1 rounded-full px-2 text-[10px]"
                      onClick={() =>
                        void onAssignBestFit(group.bookings.map((booking) => booking.id), group.tourName)
                      }
                    >
                      <WandSparkles className="h-2.5 w-2.5" />
                      Best Fit
                    </Button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div
                  className="space-y-1 border-t bg-muted/20 px-2 py-1.5 pl-3"
                  style={{ borderTopColor: `${accentColor}55` }}
                >
                  {group.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col gap-1.5 rounded-md border bg-card/80 px-2 py-1 transition-colors hover:border-primary/25 hover:bg-card"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center justify-between gap-1.5 text-left"
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
                        <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground" title={booking.customerName}>
                            {booking.customerName}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {booking.referenceNumber}
                            {booking.pickupZone?.name ? ` \u00B7 ${booking.pickupZone.name}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="h-4 shrink-0 rounded-full px-1 text-[9px] tabular-nums">
                          {booking.guestCount}p
                        </Badge>
                      </button>

                      {canEdit && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 rounded-full px-1.5 text-[10px]"
                            onClick={() => void onAssignBestFit([booking.id], booking.customerName)}
                          >
                            Best
                          </Button>
                          <select
                            aria-label={`Assign ${booking.customerName}`}
                            className="h-6 min-w-[4.5rem] rounded-full border bg-background px-1.5 text-[10px] text-foreground"
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
                            {assignableRows.map((row) => (
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
