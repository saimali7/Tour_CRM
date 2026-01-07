"use client"

/**
 * SimpleGuideRow Component
 *
 * A simplified guide row for the timeline that uses BookingBlock
 * instead of complex segment types.
 *
 * Displays:
 * - Guide info column (fixed width, left side)
 * - Booking lane (flexible, shows bookings positioned by time)
 */

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Clock, AlertTriangle } from "lucide-react"
import { BookingLane } from "./booking-lane"
import type { BookingData } from "./booking-block"
import { useEditModeOptional } from "./edit-mode-provider"
import { GUIDE_COLUMN_WIDTH } from "./timeline/timeline-utils"

// =============================================================================
// TYPES
// =============================================================================

export interface GuideInfo {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  vehicleCapacity: number
  status: "active" | "inactive" | "on_leave"
}

interface SimpleGuideRowProps {
  guide: GuideInfo
  bookings: BookingData[]
  totalGuests: number
  utilization: number // 0-100
  onClick?: () => void
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SimpleGuideRow({
  guide,
  bookings,
  totalGuests,
  utilization,
  onClick,
  className,
}: SimpleGuideRowProps) {
  const editMode = useEditModeOptional()
  const isEditing = editMode?.isEditing ?? false

  const fullName = `${guide.firstName} ${guide.lastName}`
  const initials = `${guide.firstName[0] ?? ""}${guide.lastName[0] ?? ""}`.toUpperCase()

  // Check capacity
  const isOverCapacity = totalGuests > guide.vehicleCapacity
  const capacityStatus = isOverCapacity ? "over" : totalGuests === guide.vehicleCapacity ? "full" : "ok"

  // Handle drop events (supports both single bookings and groups)
  const handleDrop = async (bookingIdOrIds: string, targetGuideId: string, targetTime: string) => {
    if (!editMode) return

    const dragState = editMode.dragState
    if (!dragState) return

    const sourceGuideId = dragState.sourceGuideId
    // Store booking info before clearing drag state (needed for time shift)
    const previousPickupTime = dragState.booking?.pickupTime ?? null

    // Clear drag state first to avoid visual glitches
    editMode.endDrag()

    // Check if this is a group drop (comma-separated IDs)
    const bookingIds = bookingIdOrIds.includes(',')
      ? bookingIdOrIds.split(',').filter(Boolean)
      : [bookingIdOrIds]

    try {
      if (bookingIds.length > 1 && sourceGuideId === null) {
        // Group drop from hopper - use batch assignment
        await editMode.assignBookingGroup(bookingIds, targetGuideId)
      } else if (sourceGuideId === null) {
        // Single booking from hopper - assign
        await editMode.assignBooking(bookingIds[0]!, targetGuideId)
      } else if (sourceGuideId === targetGuideId) {
        // Same guide - time shift (single booking only)
        await editMode.timeShiftBooking(bookingIds[0]!, targetGuideId, targetTime, previousPickupTime)
      } else {
        // Different guide - reassign (single booking only)
        await editMode.reassignBooking(bookingIds[0]!, targetGuideId)
      }
    } catch {
      // Errors are handled in the mutation handlers with toasts
    }
  }

  return (
    <div
      className={cn(
        "flex items-stretch h-16 border-b border-border/50",
        "hover:bg-muted/30 transition-colors",
        className
      )}
    >
      {/* Guide Info Column */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 cursor-pointer hover:bg-muted/50"
        style={{ width: GUIDE_COLUMN_WIDTH }}
        onClick={onClick}
      >
        {/* Avatar */}
        <Avatar className="h-8 w-8">
          <AvatarImage src={guide.avatarUrl ?? undefined} alt={fullName} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        {/* Name and capacity */}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{fullName}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {/* Guest count / capacity */}
            <span className={cn(
              "flex items-center gap-0.5",
              capacityStatus === "over" && "text-destructive",
              capacityStatus === "full" && "text-amber-600"
            )}>
              <Users className="h-3 w-3" />
              <span>{totalGuests}/{guide.vehicleCapacity}</span>
              {capacityStatus === "over" && (
                <AlertTriangle className="h-3 w-3 ml-0.5" />
              )}
            </span>

            {/* Utilization */}
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              <span>{utilization}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Booking Lane */}
      <div className="flex-1 relative">
        <BookingLane
          guideId={guide.id}
          bookings={bookings}
          isEditing={isEditing}
          selectedBookingId={editMode?.selectedBookingId}
          guideCapacity={guide.vehicleCapacity}
          currentGuests={totalGuests}
          onBookingClick={(booking) => {
            editMode?.setSelectedBookingId(booking.id)
          }}
          onDragStart={(booking) => {
            editMode?.startDrag(booking, guide.id)
          }}
          onDrop={handleDrop}
        />

        {/* Utilization bar (subtle background) */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-primary/20 transition-all"
          style={{ width: `${utilization}%` }}
        />
      </div>
    </div>
  )
}

// =============================================================================
// DROPPABLE WRAPPER FOR ADD GUIDE ROW
// =============================================================================

interface DroppableAddGuideRowProps {
  children: React.ReactNode
  onDrop?: (bookingId: string) => void
}

export function DroppableAddGuideRow({ children, onDrop }: DroppableAddGuideRowProps) {
  const editMode = useEditModeOptional()

  if (!editMode?.isEditing) {
    return <>{children}</>
  }

  return (
    <div
      className="border-2 border-dashed border-transparent hover:border-primary/30 transition-colors rounded-lg"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        e.preventDefault()
        const bookingId = e.dataTransfer.getData('text/plain')
        if (bookingId) {
          onDrop?.(bookingId)
        }
      }}
    >
      {children}
    </div>
  )
}
