"use client"

/**
 * TourRunBlock Component
 *
 * Displays a tour run on the timeline. A tour run may contain multiple bookings
 * (for shared tours) or a single booking (for charters).
 *
 * Visual representation:
 * - Positioned by tour start time
 * - Width based on tour duration
 * - Shows total guests, tour name, and booking count
 * - Can be expanded to show individual bookings
 */

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Users, Lock, MapPin, Clock } from "lucide-react"
import {
  timeToPercent,
  durationToPercent,
  getCapacityStatus,
  type TourRun,
} from "./timeline/timeline-utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// =============================================================================
// TYPES
// =============================================================================

interface TourRunBlockProps {
  tourRun: TourRun
  /** Guide's vehicle capacity for showing capacity status */
  guideCapacity?: number
  isEditing?: boolean
  isSelected?: boolean
  onClick?: () => void
  onDragStart?: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TourRunBlock({
  tourRun,
  guideCapacity,
  isEditing = false,
  isSelected = false,
  onClick,
  onDragStart,
}: TourRunBlockProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isLocalDragging, setIsLocalDragging] = useState(false)

  // Calculate position and size
  const left = timeToPercent(tourRun.startTime)
  const width = durationToPercent(tourRun.tourDurationMinutes)

  // Get primary zone color (most guests)
  const primaryZone = tourRun.pickupZones.sort((a, b) => b.count - a.count)[0]
  const borderColor = primaryZone?.color ?? "#6b7280"

  // Calculate capacity status for visual feedback
  const capacityStatus = useMemo(() => {
    if (!guideCapacity || guideCapacity === Infinity) return null
    return getCapacityStatus(tourRun, guideCapacity)
  }, [tourRun, guideCapacity])

  const handleDragStart = (e: React.DragEvent) => {
    // Set all booking IDs for group drag
    const bookingIds = tourRun.bookings.map((b) => b.id)
    e.dataTransfer.setData("text/plain", bookingIds.join(","))
    e.dataTransfer.setData("bookingIds", JSON.stringify(bookingIds))
    e.dataTransfer.setData("tourRunKey", tourRun.key)
    e.dataTransfer.effectAllowed = "move"
    setIsLocalDragging(true)
    onDragStart?.()
  }

  const handleDragEnd = () => {
    setIsLocalDragging(false)
  }

  const isSingleBooking = tourRun.bookings.length === 1
  const firstBooking = tourRun.bookings[0]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          draggable={isEditing}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onClick}
          className={cn(
            "absolute top-1 bottom-1 rounded-md overflow-hidden transition-all duration-150",
            "border-l-[3px] bg-card shadow-sm",
            // Hover state
            isHovered && !isLocalDragging && "shadow-md -translate-y-0.5 z-10",
            // Selected state
            isSelected && "ring-2 ring-primary ring-offset-1",
            // Dragging state
            isLocalDragging && "opacity-50 scale-95",
            // Edit mode cursor
            isEditing && "cursor-grab active:cursor-grabbing",
            // Charter styling
            tourRun.isCharter && "bg-amber-500/5"
          )}
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 3)}%`, // Minimum width for visibility
            borderLeftColor: borderColor,
          }}
        >
          <div className="h-full px-2 py-1 flex flex-col justify-center min-w-0">
            {/* Top row: Tour name + charter badge */}
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-medium truncate flex-1">
                {isSingleBooking ? firstBooking?.customerName : tourRun.tourName}
              </span>
              {tourRun.isCharter && (
                <Lock className="h-3 w-3 text-amber-600 shrink-0" />
              )}
            </div>

            {/* Bottom row: Guest count + booking count */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className={cn(
                "flex items-center gap-0.5",
                capacityStatus?.isAtCapacity && "text-destructive font-semibold",
                capacityStatus?.isNearCapacity && !capacityStatus?.isAtCapacity && "text-amber-600 font-medium",
              )}>
                <Users className="h-3 w-3" />
                {capacityStatus ? (
                  <span className="tabular-nums">
                    {tourRun.isCharter ? "Private" : `${capacityStatus.current}/${capacityStatus.max}`}
                  </span>
                ) : (
                  <span className="tabular-nums font-medium">{tourRun.totalGuests}</span>
                )}
              </span>
              {!isSingleBooking && (
                <span className="text-muted-foreground/70">
                  {tourRun.bookings.length} bookings
                </span>
              )}
            </div>
          </div>
        </div>
      </PopoverTrigger>

      {/* Popover with booking details */}
      <PopoverContent
        className="w-72 p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{tourRun.tourName}</span>
            {tourRun.isCharter && (
              <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" />
                CHARTER
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {tourRun.startTime}
            </span>
            <span className={cn(
              "flex items-center gap-1",
              capacityStatus?.isAtCapacity && "text-destructive font-medium",
              capacityStatus?.isNearCapacity && !capacityStatus?.isAtCapacity && "text-amber-600",
            )}>
              <Users className="h-3 w-3" />
              {capacityStatus && !tourRun.isCharter ? (
                <>{capacityStatus.current}/{capacityStatus.max} guests</>
              ) : (
                <>{tourRun.totalGuests} guests</>
              )}
            </span>
            {capacityStatus?.isAtCapacity && !tourRun.isCharter && (
              <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-medium">
                FULL
              </span>
            )}
          </div>

          {/* Pickup zones */}
          {tourRun.pickupZones.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tourRun.pickupZones.map((zone) => (
                <span
                  key={zone.name}
                  className="px-1.5 py-0.5 text-[10px] rounded inline-flex items-center gap-0.5"
                  style={{
                    backgroundColor: zone.color + "20",
                    color: zone.color,
                  }}
                >
                  <MapPin className="h-2.5 w-2.5" />
                  {zone.name} ({zone.count})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Booking list */}
        <div className="max-h-48 overflow-y-auto">
          {tourRun.bookings.map((booking) => (
            <div
              key={booking.id}
              className="px-3 py-2 border-b last:border-b-0 hover:bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">
                  {booking.customerName}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {booking.totalParticipants} guests
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{booking.referenceNumber}</span>
                {booking.pickupTime && (
                  <>
                    <span>·</span>
                    <span>Pickup {booking.pickupTime}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
