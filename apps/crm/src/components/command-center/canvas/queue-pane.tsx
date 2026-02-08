"use client";

import { useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  WandSparkles,
  Check,
  UserRound,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CanvasRow, HopperGroup } from "../dispatch-model";
import type { HopperBooking } from "../hopper/hopper-card";
import type { QueueFilterState, QueueSortMode, DragPayload } from "./canvas-types";

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// HELPERS
// =============================================================================

const ZONE_COLORS: Record<string, string> = {
  jbr: "#8B5CF6",
  marina: "#0EA5E9",
  downtown: "#F97316",
  palm: "#10B981",
  business: "#3B82F6",
  airport: "#64748B",
  beach: "#06B6D4",
  creek: "#14B8A6",
  old: "#EAB308",
  jumeirah: "#EC4899",
};

function getZoneColor(zone: HopperBooking["pickupZone"]): string {
  if (zone?.color) return zone.color;
  if (zone?.name) {
    const nameLower = zone.name.toLowerCase();
    for (const [key, color] of Object.entries(ZONE_COLORS)) {
      if (nameLower.includes(key)) return color;
    }
  }
  return "#6B7280";
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

function getHourLabel(tourTime: string): string {
  const hour = parseTourHour(tourTime);
  if (hour === null) return "";
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

const sortOptions: Array<{ mode: QueueSortMode; label: string }> = [
  { mode: "time", label: "Time" },
  { mode: "tour", label: "Tour" },
  { mode: "guests", label: "Size" },
];

// =============================================================================
// QUEUE PANE
// =============================================================================

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
  const assignableRows = useMemo(() => rows.filter((row) => !row.isOutsourced), [rows]);

  const totalQueueGuests = useMemo(
    () => groups.reduce((sum, group) => sum + group.totalGuests, 0),
    [groups],
  );

  // Derive time divider positions: indices where the hour changes
  const hourDividers = useMemo(() => {
    const dividers = new Map<number, string>();
    let lastHour: number | null = null;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (!group) continue;
      const hour = parseTourHour(group.tourTime);
      if (hour !== null && hour !== lastHour) {
        dividers.set(i, getHourLabel(group.tourTime));
        lastHour = hour;
      }
    }
    return dividers;
  }, [groups]);

  return (
    <aside
      className={cn(
        "relative z-40 hidden min-h-0 w-[260px] shrink-0 overflow-hidden border-r bg-card/90 xl:w-[276px] 2xl:w-[292px] lg:flex lg:flex-col",
        hopperDropActive && "bg-primary/5",
      )}
      onDragOver={onHopperDragOver}
      onDragLeave={onHopperDragLeave}
      onDrop={onHopperDrop}
    >
      {/* ── Header ── */}
      <header className="space-y-2 border-b bg-card/95 px-2.5 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        {/* Row 1: Search with inline guest count */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterState.search}
            onChange={(event) =>
              onFilterStateChange({ ...filterState, search: event.target.value })
            }
            placeholder="Search bookings..."
            className="h-8 pl-8 pr-16 text-xs"
          />
          {groups.length > 0 && (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              <Users className="mr-0.5 inline h-3 w-3" />
              {totalQueueGuests}
            </span>
          )}
        </div>

        {/* Row 2: Sort + Filter toggles */}
        <div className="grid grid-cols-[1fr_auto] gap-1.5">
          <div className="grid grid-cols-3 gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
            {sortOptions.map((option) => (
              <button
                key={option.mode}
                type="button"
                className={cn(
                  "focus-ring rounded px-1.5 py-1 text-[11px] font-medium transition-colors",
                  sortMode === option.mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => onSortModeChange(option.mode)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              className={cn(
                "focus-ring rounded px-1.5 py-1 text-[11px] font-medium transition-colors",
                filterState.includeJoinRuns
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() =>
                onFilterStateChange({ ...filterState, includeJoinRuns: !filterState.includeJoinRuns })
              }
              title="Toggle shared runs"
            >
              S
            </button>
            <button
              type="button"
              className={cn(
                "focus-ring rounded px-1.5 py-1 text-[11px] font-medium transition-colors",
                filterState.includeCharters
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() =>
                onFilterStateChange({ ...filterState, includeCharters: !filterState.includeCharters })
              }
              title="Toggle private charters"
            >
              C
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {groups.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">All assigned</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                No bookings waiting in queue
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map((group, index) => {
              const dividerLabel = hourDividers.get(index);
              return (
                <div key={group.id}>
                  {/* ── Time divider ── */}
                  {dividerLabel && (
                    <div className="flex items-center gap-2 px-1 py-1.5">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                        {dividerLabel}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  {/* ── Group card ── */}
                  <GroupCard
                    group={group}
                    isExpanded={expandedGroups.has(group.id)}
                    canEdit={canEdit}
                    assignableRows={assignableRows}
                    onToggle={() => onToggleGroup(group.id)}
                    onBookingClick={onBookingClick}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onAssignBestFit={onAssignBestFit}
                    onAssignToGuide={onAssignToGuide}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

// =============================================================================
// GROUP CARD
// =============================================================================

interface GroupCardProps {
  group: HopperGroup;
  isExpanded: boolean;
  canEdit: boolean;
  assignableRows: CanvasRow[];
  onToggle: () => void;
  onBookingClick: (bookingId: string) => void;
  onDragStart: (payload: DragPayload) => void;
  onDragEnd: () => void;
  onAssignBestFit: (bookingIds: string[], contextLabel: string) => Promise<void>;
  onAssignToGuide: (bookingIds: string[], guideId: string) => Promise<void>;
}

function GroupCard({
  group,
  isExpanded,
  canEdit,
  assignableRows,
  onToggle,
  onBookingClick,
  onDragStart,
  onDragEnd,
  onAssignBestFit,
  onAssignToGuide,
}: GroupCardProps) {
  const accentClass = group.isCharter ? "border-l-warning" : "border-l-info";

  return (
    <article
      className={cn(
        "rounded-md border border-border border-l-[3px] bg-card transition-all duration-150",
        accentClass,
        canEdit && "hover:border-primary/30",
      )}
      draggable={canEdit}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", group.id);
        onDragStart({
          source: "hopper",
          sourceGuideId: null,
          bookingIds: group.bookings.map((b) => b.id),
          guestCount: group.totalGuests,
        });
      }}
      onDragEnd={onDragEnd}
    >
      {/* ── Group header row ── */}
      <button
        type="button"
        className="focus-ring flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-left"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className="w-[38px] shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {group.tourTime}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground" title={group.tourName}>
          {group.tourName}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {group.totalGuests}g&thinsp;&middot;&thinsp;{group.totalBookings}b
        </span>
        <span
          className={cn(
            "shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none",
            group.isCharter
              ? "bg-warning/10 text-warning"
              : "bg-info/10 text-info",
          )}
        >
          {group.isCharter ? "C" : "S"}
        </span>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* ── Expanded bookings ── */}
      {isExpanded && (
        <div className="border-t border-border px-1.5 pb-1.5 pt-1">
          {/* Auto-assign all */}
          {canEdit && group.bookings.length > 1 && (
            <button
              type="button"
              className="focus-ring mb-1 flex w-full items-center justify-center gap-1 rounded py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() =>
                void onAssignBestFit(
                  group.bookings.map((b) => b.id),
                  group.tourName,
                )
              }
            >
              <WandSparkles className="h-3 w-3" />
              Auto-assign all
            </button>
          )}

          {group.bookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              canEdit={canEdit}
              assignableRows={assignableRows}
              onBookingClick={onBookingClick}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onAssignBestFit={onAssignBestFit}
              onAssignToGuide={onAssignToGuide}
            />
          ))}
        </div>
      )}
    </article>
  );
}

// =============================================================================
// BOOKING ROW
// =============================================================================

interface BookingRowProps {
  booking: HopperBooking;
  canEdit: boolean;
  assignableRows: CanvasRow[];
  onBookingClick: (bookingId: string) => void;
  onDragStart: (payload: DragPayload) => void;
  onDragEnd: () => void;
  onAssignBestFit: (bookingIds: string[], contextLabel: string) => Promise<void>;
  onAssignToGuide: (bookingIds: string[], guideId: string) => Promise<void>;
}

function BookingRow({
  booking,
  canEdit,
  assignableRows,
  onBookingClick,
  onDragStart,
  onDragEnd,
  onAssignBestFit,
  onAssignToGuide,
}: BookingRowProps) {
  const zoneColor = getZoneColor(booking.pickupZone);

  return (
    <div
      className="group/row flex min-w-0 items-center gap-1.5 rounded px-1 py-[3px] transition-colors hover:bg-muted/50"
      draggable={canEdit}
      onDragStart={(event) => {
        event.stopPropagation();
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
      {/* Zone dot */}
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: zoneColor }}
        title={booking.pickupZone?.name ?? "No zone"}
      />

      {/* Customer name - clickable */}
      <button
        type="button"
        className="focus-ring min-w-0 flex-1 truncate rounded text-left text-xs font-medium text-foreground"
        onClick={() => onBookingClick(booking.id)}
        title={booking.customerName}
      >
        {booking.customerName}
      </button>

      {/* Zone name */}
      {booking.pickupZone && (
        <span
          className="hidden shrink-0 text-[10px] font-medium xl:inline"
          style={{ color: zoneColor }}
        >
          {booking.pickupZone.name}
        </span>
      )}

      {/* Guest count */}
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {booking.guestCount}g
      </span>

      {/* Actions - visible on hover / focus-within */}
      {canEdit && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
          {/* Best Fit */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              void onAssignBestFit([booking.id], booking.customerName);
            }}
            title="Best Fit"
          >
            <WandSparkles className="h-3 w-3" />
          </Button>

          {/* Assign to guide dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
                title="Assign to guide"
              >
                <UserRound className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              {assignableRows.map((row) => (
                <DropdownMenuItem
                  key={row.guide.id}
                  onClick={() => void onAssignToGuide([booking.id], row.guide.id)}
                >
                  {`${row.guide.firstName} ${row.guide.lastName}`.trim()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
