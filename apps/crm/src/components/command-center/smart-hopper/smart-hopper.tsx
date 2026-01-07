"use client"

/**
 * SmartHopper Component
 *
 * An intelligent hopper that groups unassigned bookings for efficient dispatch.
 *
 * Features:
 * - Groups shared bookings by tour + time (can be assigned together)
 * - Keeps charter bookings separate (private experiences)
 * - Sortable by time, tour, guests, or type
 * - Filterable by tour, time period, or booking type
 * - Drag entire groups or individual bookings
 */

import { useMemo, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Search,
  CheckCircle2,
  Users,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Clock,
  LayoutGrid,
  List,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingGroupCard } from "./booking-group-card"
import { groupBookings, sortGroups, filterGroups, getUniqueTours } from "./grouping"
import {
  type BookingGroup,
  type SortOption,
  type HopperFilters,
  type ViewMode,
  defaultFilters,
} from "./types"
import type { BookingData } from "../booking-block"
import { useEditModeOptional } from "../edit-mode-provider"

// =============================================================================
// TYPES
// =============================================================================

interface SmartHopperProps {
  bookings: BookingData[]
  onBookingClick?: (booking: BookingData) => void
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SmartHopper({
  bookings,
  onBookingClick,
  className,
}: SmartHopperProps) {
  // State
  const [sortBy, setSortBy] = useState<SortOption>("time")
  const [filters, setFilters] = useState<HopperFilters>(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Edit mode context
  const editMode = useEditModeOptional()
  const isEditing = editMode?.isEditing ?? false
  const isMutating = editMode?.isMutating ?? false

  // Drop zone state
  const [isDragOver, setIsDragOver] = useState(false)

  // Get unique tours for filter
  const uniqueTours = useMemo(() => getUniqueTours(bookings), [bookings])

  // Group, filter, and sort bookings
  const processedGroups = useMemo(() => {
    const grouped = groupBookings(bookings)
    const filtered = filterGroups(grouped, filters)
    return sortGroups(filtered, sortBy)
  }, [bookings, filters, sortBy])

  // Calculate totals
  const totalGuests = bookings.reduce((sum, b) => sum + b.totalParticipants, 0)
  const filteredGuests = processedGroups.reduce((sum, g) => sum + g.totalGuests, 0)

  // Count active filters
  const activeFilterCount =
    (filters.search.trim() ? 1 : 0) +
    filters.tours.size +
    (filters.type !== "all" ? 1 : 0) +
    (filters.time !== "all" ? 1 : 0)

  // Handlers
  const toggleGroupExpanded = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const toggleTourFilter = useCallback((tourId: string) => {
    setFilters((prev) => {
      const tours = new Set(prev.tours)
      if (tours.has(tourId)) {
        tours.delete(tourId)
      } else {
        tours.add(tourId)
      }
      return { ...prev, tours }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  // Handle group drag start
  const handleGroupDragStart = useCallback(
    (group: BookingGroup) => {
      if (!editMode) return
      // Start drag with first booking as reference, null sourceGuideId means from hopper
      const firstBooking = group.bookings[0]
      if (firstBooking) {
        editMode.startDrag(firstBooking, null)
      }
    },
    [editMode]
  )

  // Handle individual booking drag start
  const handleBookingDragStart = useCallback(
    (booking: BookingData) => {
      if (!editMode) return
      editMode.startDrag(booking, null)
    },
    [editMode]
  )

  // Handle drop for unassignment
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isEditing) return
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      setIsDragOver(true)
    },
    [isEditing]
  )

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      if (!editMode || !isEditing) return

      const bookingId = e.dataTransfer.getData("text/plain")
      if (!bookingId) return

      // Only unassign if the booking was from a guide (not already in hopper)
      const dragState = editMode.dragState
      if (dragState && dragState.sourceGuideId !== null) {
        const sourceGuideId = dragState.sourceGuideId
        editMode.endDrag()

        try {
          await editMode.unassignBooking(bookingId, sourceGuideId)
        } catch {
          // Errors handled by mutation
        }
      } else {
        editMode.endDrag()
      }
    },
    [editMode, isEditing]
  )

  return (
    <div
      className={cn(
        "relative flex flex-col h-full bg-card",
        isDragOver && "ring-2 ring-primary ring-inset bg-primary/5",
        isMutating && "opacity-70",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Loading overlay */}
      {isMutating && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/30">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Header */}
      <div className="flex-none border-b">
        {/* Title row */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Unassigned</h3>
            <span className="text-sm tabular-nums text-muted-foreground">
              {processedGroups.length} group{processedGroups.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="tabular-nums font-medium">{totalGuests}</span>
            </div>
            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1 h-6 px-2 text-xs rounded-md transition-colors",
                showFilters || activeFilterCount > 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Filter className="h-3 w-3" />
              {activeFilterCount > 0 && (
                <span className="tabular-nums">{activeFilterCount}</span>
              )}
              {showFilters ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative px-3 pb-2">
          <Search className="absolute left-[22px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, tour, zone..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Sort controls */}
        <div className="px-3 pb-2 flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
            Sort:
          </span>
          {(["time", "tour", "guests", "type"] as SortOption[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSortBy(option)}
              className={cn(
                "h-6 px-2 text-[11px] font-medium rounded transition-colors capitalize",
                sortBy === option
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="px-3 pb-2.5 border-t pt-2.5 bg-muted/30 space-y-3">
            {/* Tour filter */}
            {uniqueTours.length > 1 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Tour
                </div>
                <div className="flex flex-wrap gap-1">
                  {uniqueTours.map((tour) => (
                    <button
                      key={tour.id}
                      type="button"
                      onClick={() => toggleTourFilter(tour.id)}
                      className={cn(
                        "h-6 px-2 text-[11px] font-medium rounded transition-colors truncate max-w-[140px]",
                        filters.tours.has(tour.id)
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title={tour.name}
                    >
                      {tour.name} ({tour.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type filter */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Type
              </div>
              <div className="flex gap-1">
                {(["all", "shared", "charter"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, type }))
                    }
                    className={cn(
                      "h-6 px-2 text-[11px] font-medium rounded transition-colors capitalize",
                      filters.type === type
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Time filter */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Time
              </div>
              <div className="flex gap-1">
                {(["all", "morning", "afternoon", "evening"] as const).map(
                  (time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, time }))
                      }
                      className={cn(
                        "h-6 px-2 text-[11px] font-medium rounded transition-colors capitalize",
                        filters.time === time
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {time}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Active filter summary (when filters collapsed) */}
        {!showFilters && activeFilterCount > 0 && (
          <div className="px-3 pb-2 flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">
              Showing {filteredGuests} of {totalGuests} guests
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-primary hover:underline flex items-center gap-0.5"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {bookings.length === 0 ? (
          // All assigned state
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm font-medium">All Assigned</p>
            <p className="text-xs text-muted-foreground mt-1">
              Every booking has a guide
            </p>
          </div>
        ) : processedGroups.length === 0 ? (
          // No matches
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No matches</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your filters
            </p>
            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:underline mt-2"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          // Group list
          processedGroups.map((group) => (
            <BookingGroupCard
              key={group.key}
              group={group}
              isEditing={isEditing}
              isExpanded={expandedGroups.has(group.key)}
              onToggleExpand={() => toggleGroupExpanded(group.key)}
              onDragStart={handleGroupDragStart}
              onBookingDragStart={handleBookingDragStart}
              onBookingClick={(booking) => {
                editMode?.setSelectedBookingId(booking.id)
                onBookingClick?.(booking)
              }}
            />
          ))
        )}
      </div>

      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none flex items-center justify-center z-10">
          <div className="bg-card rounded-lg px-4 py-2 shadow-lg">
            <p className="text-sm font-medium text-primary">Drop to unassign</p>
          </div>
        </div>
      )}
    </div>
  )
}
