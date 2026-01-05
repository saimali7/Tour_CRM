"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDebounce } from "@/hooks/use-debounce";
import { useAdjustMode } from "../adjust-mode";
import { HopperCard, type HopperBooking } from "./hopper-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  ArrowUpDown,
  CheckCircle2,
  Users,
  LayoutList,
  LayoutGrid,
  Sun,
  Sunset,
  Moon,
  ChevronDown,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface HopperPanelProps {
  /**
   * List of unassigned bookings to display
   */
  bookings: HopperBooking[];

  /**
   * Callback when a booking card is clicked
   */
  onBookingClick?: (booking: HopperBooking) => void;

  /**
   * Currently selected booking ID
   */
  selectedBookingId?: string | null;

  /**
   * List of available zones for filtering
   */
  zones?: Array<{ id: string; name: string; color: string }>;

  /**
   * Whether the panel is in a loading state
   */
  isLoading?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

type SortOption = "priority" | "time" | "zone" | "guests";
type DisplayMode = "full" | "compact";
type TimePeriod = "morning" | "afternoon" | "evening";

// =============================================================================
// TIME PERIOD HELPERS
// =============================================================================

interface TimePeriodConfig {
  id: TimePeriod;
  label: string;
  shortLabel: string;
}

const TIME_PERIODS: TimePeriodConfig[] = [
  { id: "morning", label: "Morning", shortLabel: "before 12pm" },
  { id: "afternoon", label: "Afternoon", shortLabel: "12pm - 5pm" },
  { id: "evening", label: "Evening", shortLabel: "after 5pm" },
];

function getTimePeriod(tourTime: string | undefined): TimePeriod {
  if (!tourTime) return "morning"; // Default to morning if no time

  const timeParts = tourTime.split(":");
  if (timeParts.length < 2) return "morning";

  const hour = parseInt(timeParts[0] || "0", 10);

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function groupBookingsByTimePeriod(bookings: HopperBooking[]): Map<TimePeriod, HopperBooking[]> {
  const groups = new Map<TimePeriod, HopperBooking[]>();

  // Initialize all periods (we'll filter empty ones later)
  for (const period of TIME_PERIODS) {
    groups.set(period.id, []);
  }

  // Group bookings
  for (const booking of bookings) {
    const period = getTimePeriod(booking.tourTime);
    const periodBookings = groups.get(period) || [];
    periodBookings.push(booking);
    groups.set(period, periodBookings);
  }

  return groups;
}

// =============================================================================
// TIME SECTION HEADER COMPONENT
// =============================================================================

interface TimeSectionHeaderProps {
  period: TimePeriodConfig;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

const PERIOD_ICONS: Record<TimePeriod, typeof Sun> = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
};

function TimeSectionHeader({ period, count, isCollapsed, onToggle }: TimeSectionHeaderProps) {
  const Icon = PERIOD_ICONS[period.id];

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "sticky top-0 z-10 w-full flex items-center gap-2 px-2 py-1.5",
        "bg-muted/80 backdrop-blur-sm border-b border-border/50",
        "text-left transition-colors duration-150",
        "hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      )}
      aria-expanded={!isCollapsed}
      aria-controls={`section-${period.id}`}
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-xs font-medium text-foreground">{period.label}</span>
      <span className="text-[10px] text-muted-foreground">({period.shortLabel})</span>
      <Badge
        variant="secondary"
        className="ml-auto text-[10px] h-4 px-1.5 tabular-nums"
      >
        {count}
      </Badge>
      <ChevronDown
        className={cn(
          "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
          isCollapsed && "-rotate-90"
        )}
      />
    </button>
  );
}

// =============================================================================
// HELPER - Pluralize
// =============================================================================

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

// =============================================================================
// SORTING HELPERS
// =============================================================================

function sortBookings(bookings: HopperBooking[], sortBy: SortOption): HopperBooking[] {
  return [...bookings].sort((a, b) => {
    switch (sortBy) {
      case "priority":
        // Priority: VIP > Special Occasion > First Timer > Guest Count > Time
        const priorityA = getPriority(a);
        const priorityB = getPriority(b);
        return priorityB - priorityA;

      case "time":
        // Sort by tour time
        return (a.tourTime || "").localeCompare(b.tourTime || "");

      case "zone":
        // Sort by zone name
        const zoneA = a.pickupZone?.name || "zzz";
        const zoneB = b.pickupZone?.name || "zzz";
        return zoneA.localeCompare(zoneB);

      case "guests":
        // Sort by guest count descending
        return b.guestCount - a.guestCount;

      default:
        return 0;
    }
  });
}

function getPriority(booking: HopperBooking): number {
  let priority = 0;

  // VIP gets highest priority
  if (booking.isVIP) priority += 100;

  // Special occasion
  if (booking.specialOccasion) priority += 50;

  // First timer
  if (booking.isFirstTimer) priority += 25;

  // Accessibility needs
  if (booking.accessibilityNeeds) priority += 20;

  // Larger groups get slightly higher priority
  priority += Math.min(booking.guestCount, 10);

  // Earlier tour time gets higher priority (closer to now = more urgent)
  // Simple: just use reversed time sort
  const timeParts = booking.tourTime?.split(":") || [];
  if (timeParts.length === 2) {
    const hour = parseInt(timeParts[0] || "12", 10);
    priority += (24 - hour);
  }

  return priority;
}

// =============================================================================
// HOPPER PANEL COMPONENT
// =============================================================================

// =============================================================================
// ZONE COLOR PALETTE
// =============================================================================

const ZONE_COLORS: Record<string, string> = {
  JBR: "#8B5CF6",
  Marina: "#0EA5E9",
  "Business Bay": "#3B82F6",
  Downtown: "#F97316",
  "Palm Jumeirah": "#A855F7",
  "Dubai Hills": "#10B981",
  Deira: "#EC4899",
  "Al Barsha": "#14B8A6",
};

function getZoneColor(zoneName: string, fallbackColor?: string): string {
  return ZONE_COLORS[zoneName] || fallbackColor || "#6B7280";
}

// =============================================================================
// HOPPER PANEL COMPONENT
// =============================================================================

export function HopperPanel({
  bookings,
  onBookingClick,
  selectedBookingId,
  zones = [],
  isLoading = false,
  className,
}: HopperPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("priority");
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [displayMode, setDisplayMode] = useState<DisplayMode>("full");
  const [collapsedSections, setCollapsedSections] = useState<Set<TimePeriod>>(new Set());

  // Get pending assigned booking IDs from adjust mode
  const { pendingAssignedBookingIds, isAdjustMode } = useAdjustMode();

  // Debounce search for performance (300ms delay)
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Set up droppable for returning bookings to the hopper
  const { setNodeRef, isOver } = useDroppable({
    id: "hopper",
    data: { type: "hopper" },
  });

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = bookings;

    // Filter by search query (using debounced value)
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (b) =>
          b.customerName.toLowerCase().includes(query) ||
          b.referenceNumber.toLowerCase().includes(query) ||
          b.tourName.toLowerCase().includes(query) ||
          b.pickupZone?.name.toLowerCase().includes(query)
      );
    }

    // Filter by selected zones (multi-select)
    if (selectedZones.size > 0) {
      result = result.filter((b) => {
        const zoneName = b.pickupZone?.name || "No Zone";
        return selectedZones.has(zoneName);
      });
    }

    // Sort
    return sortBookings(result, sortBy);
  }, [bookings, debouncedSearch, sortBy, selectedZones]);

  // Group by zone for the stats
  const zoneStats = useMemo(() => {
    const stats: Record<string, { count: number; guests: number; color: string }> = {};
    for (const booking of bookings) {
      const zoneName = booking.pickupZone?.name || "No Zone";
      const zoneColor = getZoneColor(zoneName, booking.pickupZone?.color);
      if (!stats[zoneName]) {
        stats[zoneName] = { count: 0, guests: 0, color: zoneColor };
      }
      stats[zoneName]!.count++;
      stats[zoneName]!.guests += booking.guestCount;
    }
    return stats;
  }, [bookings]);

  // Group filtered bookings by time period
  const groupedBookings = useMemo(() => {
    return groupBookingsByTimePeriod(filteredBookings);
  }, [filteredBookings]);

  // Toggle section collapse
  const toggleSection = (period: TimePeriod) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
  };

  // Toggle zone filter selection
  const toggleZoneFilter = (zoneName: string) => {
    setSelectedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneName)) {
        next.delete(zoneName);
      } else {
        next.add(zoneName);
      }
      return next;
    });
  };

  // Clear all zone filters
  const clearZoneFilters = () => {
    setSelectedZones(new Set());
  };

  const totalGuests = bookings.reduce((sum, b) => sum + b.guestCount, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex flex-col h-full bg-card border-r border-border",
        isOver && "bg-primary/5 ring-2 ring-primary ring-inset",
        className
      )}
    >
      {/* Header */}
      <div className="flex-none px-2.5 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Unassigned
            </h3>
            <Badge variant="secondary" className="text-xs tabular-nums">
              {bookings.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Guest count */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="tabular-nums">{totalGuests}</span>
            </div>

            {/* Display mode toggle */}
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center border rounded-md">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-6 w-6 p-0 rounded-r-none",
                        displayMode === "full" && "bg-muted"
                      )}
                      onClick={() => setDisplayMode("full")}
                      aria-label="Full view"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Full cards
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-6 w-6 p-0 rounded-l-none border-l",
                        displayMode === "compact" && "bg-muted"
                      )}
                      onClick={() => setDisplayMode("compact")}
                      aria-label="Compact view"
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Compact list
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-1.5">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-7 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="time">Tour Time</SelectItem>
              <SelectItem value="zone">Zone</SelectItem>
              <SelectItem value="guests">Guest Count</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Zone filter pills - clickable toggles */}
      {Object.keys(zoneStats).length > 0 && (
        <div className="flex-none px-2 py-1.5 border-b border-border/50">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by zone">
            {/* All button to clear filters */}
            <button
              type="button"
              onClick={clearZoneFilters}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                "border transition-all duration-150 ease-in-out",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                selectedZones.size === 0
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
              )}
              aria-pressed={selectedZones.size === 0}
            >
              All
              <span className="tabular-nums">({bookings.length})</span>
            </button>

            {/* Zone toggle pills */}
            {Object.entries(zoneStats).map(([zoneName, { count, color }]) => {
              const isActive = selectedZones.has(zoneName);
              return (
                <button
                  key={zoneName}
                  type="button"
                  onClick={() => toggleZoneFilter(zoneName)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                    "border transition-all duration-150 ease-in-out",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                    "hover:scale-[1.02] active:scale-[0.98]"
                  )}
                  style={{
                    backgroundColor: isActive ? color : "transparent",
                    borderColor: color,
                    color: isActive ? "#FFFFFF" : color,
                    // Ring color matches zone color for focus state
                    // @ts-expect-error CSS custom property for focus ring
                    "--tw-ring-color": color,
                  }}
                  aria-pressed={isActive}
                >
                  {/* Zone indicator dot - only show when inactive */}
                  {!isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <span className="truncate max-w-[80px]">{zoneName}</span>
                  <span className="tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Active filter indicator */}
          {selectedZones.size > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground">
              <span>
                Showing {filteredBookings.length} of {bookings.length} {pluralize(bookings.length, "booking")}
              </span>
              <button
                type="button"
                onClick={clearZoneFilters}
                className="text-primary hover:text-primary/80 underline-offset-2 hover:underline transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Booking list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Loading skeleton
          <div className="p-1.5 space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg bg-muted/50 animate-pulse",
                  displayMode === "compact" ? "h-8" : "h-24"
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-6 text-center">
            {bookings.length === 0 ? (
              <>
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-sm font-medium text-foreground">All Assigned!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Every booking has a guide</p>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No matches</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Try different filters</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1.5 h-6 text-[11px]"
                  onClick={() => {
                    setSearchQuery("");
                    clearZoneFilters();
                  }}
                >
                  Clear filters
                </Button>
              </>
            )}
          </div>
        ) : (
          // Time-grouped booking sections
          <div role="list" aria-label="Unassigned bookings">
            {TIME_PERIODS.map((period) => {
              const periodBookings = groupedBookings.get(period.id) || [];

              // Hide empty sections
              if (periodBookings.length === 0) return null;

              const isCollapsed = collapsedSections.has(period.id);

              return (
                <section
                  key={period.id}
                  id={`section-${period.id}`}
                  aria-labelledby={`header-${period.id}`}
                >
                  <TimeSectionHeader
                    period={period}
                    count={periodBookings.length}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleSection(period.id)}
                  />

                  {!isCollapsed && (
                    <div
                      className={cn(
                        "p-1.5",
                        displayMode === "compact" ? "space-y-0.5" : "space-y-1.5"
                      )}
                    >
                      {periodBookings.map((booking) => {
                        const isPending = isAdjustMode && pendingAssignedBookingIds.has(booking.id);
                        return (
                          <div key={booking.id} role="listitem">
                            <HopperCard
                              booking={booking}
                              isSelected={selectedBookingId === booking.id}
                              onClick={() => onBookingClick?.(booking)}
                              displayMode={displayMode}
                              isPendingAssignment={isPending}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Drop indicator overlay */}
      {isOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none flex items-center justify-center z-10">
          <div className="bg-card rounded-lg px-4 py-2 shadow-lg">
            <p className="text-sm font-medium text-primary">
              Drop to unassign
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

HopperPanel.displayName = "HopperPanel";
