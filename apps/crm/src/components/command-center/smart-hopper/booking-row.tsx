"use client"

/**
 * BookingRow Component
 *
 * A compact row for displaying a single booking within a group.
 * Can be dragged individually to assign just that booking.
 */

import { cn } from "@/lib/utils"
import { Users, Clock, MapPin, Star, Gift } from "lucide-react"
import type { BookingData } from "../booking-block"

interface BookingRowProps {
  booking: BookingData
  isEditing: boolean
  onDragStart: () => void
  onClick: () => void
}

export function BookingRow({
  booking,
  isEditing,
  onDragStart,
  onClick,
}: BookingRowProps) {
  return (
    <div
      draggable={isEditing}
      onDragStart={(e) => {
        e.stopPropagation() // Don't trigger group drag
        e.dataTransfer.setData("text/plain", booking.id)
        e.dataTransfer.setData("bookingId", booking.id)
        e.dataTransfer.effectAllowed = "move"
        onDragStart()
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
        "hover:bg-muted/50 transition-colors",
        isEditing && "cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Customer name */}
      <span className="font-medium truncate flex-1 min-w-0">
        {booking.customerName}
      </span>

      {/* Indicators */}
      <div className="flex items-center gap-1.5 shrink-0">
        {booking.isFirstTime && (
          <Star className="h-3 w-3 text-amber-500" />
        )}
        {booking.specialOccasion && (
          <Gift className="h-3 w-3 text-pink-500" />
        )}
      </div>

      {/* Guest count */}
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums shrink-0">
        <Users className="h-3 w-3" />
        {booking.totalParticipants}
      </span>

      {/* Pickup zone */}
      {booking.pickupZoneName && (
        <span
          className="px-1.5 py-0.5 text-[10px] rounded shrink-0 truncate max-w-[80px]"
          style={{
            backgroundColor: (booking.pickupZoneColor ?? "#888888") + "20",
            color: booking.pickupZoneColor ?? "#888888",
          }}
          title={booking.pickupZoneName}
        >
          {booking.pickupZoneName}
        </span>
      )}

      {/* Pickup time */}
      {booking.pickupTime && (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums shrink-0">
          <Clock className="h-3 w-3" />
          {booking.pickupTime}
        </span>
      )}
    </div>
  )
}
