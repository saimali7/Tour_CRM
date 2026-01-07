"use client"

/**
 * SimpleHopper Component
 *
 * A simplified hopper panel for unassigned bookings that uses
 * the new BookingBlock component and EditModeProvider.
 *
 * Features:
 * - Search and filter unassigned bookings
 * - Drag bookings to guide rows to assign
 * - Drop zone for unassigning bookings
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
} from "lucide-react"
import { BookingBlock, type BookingData } from "./booking-block"
import { useEditModeOptional } from "./edit-mode-provider"

// =============================================================================
// TYPES
// =============================================================================

interface SimpleHopperProps {
  bookings: BookingData[]
  onBookingClick?: (booking: BookingData) => void
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SimpleHopper({
  bookings,
  onBookingClick,
  className,
}: SimpleHopperProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTours, setSelectedTours] = useState<Set<string>>(new Set())

  const editMode = useEditModeOptional()
  const isEditing = editMode?.isEditing ?? false
  const isMutating = editMode?.isMutating ?? false
  const [isDragOver, setIsDragOver] = useState(false)

  // Get unique tours from bookings
  const tours = useMemo(() => {
    const tourMap = new Map<string, number>()
    for (const b of bookings) {
      tourMap.set(b.tourName, (tourMap.get(b.tourName) ?? 0) + 1)
    }
    return Array.from(tourMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [bookings])

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let result = bookings

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (b) =>
          b.customerName.toLowerCase().includes(query) ||
          b.referenceNumber.toLowerCase().includes(query) ||
          b.tourName.toLowerCase().includes(query) ||
          b.pickupZoneName?.toLowerCase().includes(query)
      )
    }

    // Tour filter
    if (selectedTours.size > 0) {
      result = result.filter((b) => selectedTours.has(b.tourName))
    }

    return result
  }, [bookings, searchQuery, selectedTours])

  // Sort by time, then by zone for pickup efficiency
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      // First by time
      const timeA = a.pickupTime ?? "00:00"
      const timeB = b.pickupTime ?? "00:00"
      if (timeA !== timeB) return timeA.localeCompare(timeB)
      // Then by zone
      const zoneA = a.pickupZoneName ?? "zzz"
      const zoneB = b.pickupZoneName ?? "zzz"
      if (zoneA !== zoneB) return zoneA.localeCompare(zoneB)
      // Then larger groups first
      return b.totalParticipants - a.totalParticipants
    })
  }, [filteredBookings])

  // Toggle helpers
  const toggleTour = (tourName: string) => {
    setSelectedTours((prev) => {
      const next = new Set(prev)
      if (next.has(tourName)) next.delete(tourName)
      else next.add(tourName)
      return next
    })
  }

  const clearFilters = () => {
    setSelectedTours(new Set())
    setSearchQuery("")
  }

  const totalGuests = bookings.reduce((sum, b) => sum + b.totalParticipants, 0)
  const activeFilterCount = selectedTours.size + (searchQuery.trim() ? 1 : 0)

  // Handle drop for unassignment
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isEditing) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [isEditing])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (!editMode || !isEditing) return

    const bookingId = e.dataTransfer.getData('text/plain')
    if (!bookingId) return

    // Only unassign if the booking was from a guide (not already in hopper)
    const dragState = editMode.dragState
    if (dragState && dragState.sourceGuideId !== null) {
      // Capture sourceGuideId before clearing drag state
      const sourceGuideId = dragState.sourceGuideId

      // Clear drag state
      editMode.endDrag()

      try {
        // Pass the sourceGuideId explicitly for undo support
        await editMode.unassignBooking(bookingId, sourceGuideId)
      } catch {
        // Errors are handled in the mutation handlers with toasts
      }
    } else {
      // Clear drag state even for no-op drops (hopper to hopper)
      editMode.endDrag()
    }
  }, [editMode, isEditing])

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
              {bookings.length}
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Expandable Filters */}
        {showFilters && tours.length > 1 && (
          <div className="px-3 pb-2.5 border-t pt-2.5 bg-muted/30">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Tour
            </div>
            <div className="flex flex-wrap gap-1">
              {tours.map((tour) => (
                <button
                  key={tour.name}
                  type="button"
                  onClick={() => toggleTour(tour.name)}
                  className={cn(
                    "h-6 px-2 text-[11px] font-medium rounded transition-colors truncate max-w-[140px]",
                    selectedTours.has(tour.name)
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  title={tour.name}
                >
                  {tour.name} ({tour.count})
                </button>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] text-primary hover:underline mt-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Active filter summary */}
        {!showFilters && activeFilterCount > 0 && (
          <div className="px-3 pb-2 flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">
              Showing {filteredBookings.length} of {bookings.length}
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

      {/* Booking List */}
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
        ) : filteredBookings.length === 0 ? (
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
          // Booking list
          sortedBookings.map((booking) => (
            <BookingBlock
              key={booking.id}
              booking={booking}
              mode="hopper"
              isEditing={isEditing}
              isSelected={editMode?.selectedBookingId === booking.id}
              onClick={() => {
                editMode?.setSelectedBookingId(booking.id)
                onBookingClick?.(booking)
              }}
              onDragStart={() => {
                editMode?.startDrag(booking, null) // null = from hopper
              }}
              // Note: Don't call endDrag here - let drop handlers manage state
              // to avoid race conditions where dragState is cleared before drop
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
