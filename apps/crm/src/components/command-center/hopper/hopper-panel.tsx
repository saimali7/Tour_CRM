"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDebounce } from "@/hooks/use-debounce";
import { useAdjustMode } from "../adjust-mode";
import { HopperCard, type HopperBooking } from "./hopper-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  MapPin,
  CheckCircle2,
  Users,
  LayoutList,
  LayoutGrid,
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
  const [filterZone, setFilterZone] = useState<string>("all");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("full");

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

    // Filter by zone
    if (filterZone !== "all") {
      if (filterZone === "no-zone") {
        result = result.filter((b) => !b.pickupZone);
      } else {
        result = result.filter((b) => b.pickupZone?.id === filterZone);
      }
    }

    // Sort
    return sortBookings(result, sortBy);
  }, [bookings, debouncedSearch, sortBy, filterZone]);

  // Group by zone for the stats
  const zoneStats = useMemo(() => {
    const stats: Record<string, { count: number; guests: number; color: string }> = {};
    for (const booking of bookings) {
      const zoneName = booking.pickupZone?.name || "No Zone";
      const zoneColor = booking.pickupZone?.color || "#6B7280";
      if (!stats[zoneName]) {
        stats[zoneName] = { count: 0, guests: 0, color: zoneColor };
      }
      stats[zoneName]!.count++;
      stats[zoneName]!.guests += booking.guestCount;
    }
    return stats;
  }, [bookings]);

  const totalGuests = bookings.reduce((sum, b) => sum + b.guestCount, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full bg-card border-r border-border",
        isOver && "bg-primary/5",
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

        {/* Filters */}
        <div className="flex items-center gap-1.5">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-7 text-xs flex-1">
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

          {zones.length > 0 && (
            <Select value={filterZone} onValueChange={setFilterZone}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <MapPin className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: zone.color }}
                      />
                      {zone.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Zone stats quick view */}
      {Object.keys(zoneStats).length > 1 && (
        <div className="flex-none px-2 py-1.5 border-b border-border/50 flex flex-wrap gap-1">
          {Object.entries(zoneStats).map(([zoneName, { count, color }]) => (
            <Badge
              key={zoneName}
              variant="outline"
              className="text-[10px] font-medium cursor-pointer hover:bg-accent"
              style={{
                borderColor: color,
                color: color,
              }}
              onClick={() => {
                if (zoneName === "No Zone") {
                  setFilterZone("no-zone");
                } else {
                  const zone = zones.find((z) => z.name === zoneName);
                  if (zone) setFilterZone(zone.id);
                }
              }}
            >
              {zoneName} ({count})
            </Badge>
          ))}
        </div>
      )}

      {/* Booking list */}
      <div className="flex-1 overflow-y-auto">
        <div
          className={cn(
            "p-1.5",
            displayMode === "compact" ? "space-y-0.5" : "space-y-1.5"
          )}
          role={filteredBookings.length > 0 ? "list" : undefined}
          aria-label={filteredBookings.length > 0 ? "Unassigned bookings" : undefined}
        >
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg bg-muted/50 animate-pulse",
                  displayMode === "compact" ? "h-8" : "h-24"
                )}
                aria-hidden="true"
              />
            ))
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
                      setFilterZone("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          ) : (
            // Booking cards with list item semantics
            filteredBookings.map((booking) => {
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
            })
          )}
        </div>
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
