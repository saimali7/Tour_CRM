"use client"

/**
 * BookingBlock Component
 *
 * The core draggable unit for the timeline. Represents a single booking
 * that can be dragged between guides or to/from the hopper.
 *
 * Used in two modes:
 * - 'timeline': Positioned absolutely based on time
 * - 'hopper': Displayed as a card in a list
 *
 * Visual states (Phase 3):
 * - Default: Subtle shadow, ready for interaction
 * - Hover: Slight lift, grab cursor
 * - Dragging: Elevated shadow, slight rotation, reduced opacity
 * - Selected: Primary ring
 * - Just dropped: Settle animation
 */

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Users, Clock, MapPin, Gift, Star, AlertTriangle } from "lucide-react"
import {
  formatTimeDisplay,
  getZoneColor,
  timeToPercent,
  durationToPercent,
  layoutBookingsIntoLanes,
} from "./timeline/timeline-utils"

// =============================================================================
// TYPES
// =============================================================================

export interface BookingData {
  id: string
  referenceNumber: string
  customerName: string
  totalParticipants: number
  adultCount: number
  childCount?: number | null
  pickupTime: string | null
  pickupLocation: string | null
  pickupZoneName?: string | null
  pickupZoneColor?: string | null
  tourId: string
  tourName: string
  tourDurationMinutes: number
  specialOccasion?: string | null
  isFirstTime?: boolean
  guideId?: string | null
  guideName?: string | null
  /** Experience mode: 'join'/'book' = shared, 'charter' = private */
  experienceMode?: 'join' | 'book' | 'charter' | null
  /** The scheduled tour time (HH:MM) - used for grouping */
  bookingTime?: string | null
}

interface BookingBlockProps {
  booking: BookingData

  /** Display mode */
  mode: 'timeline' | 'hopper'

  /** Whether this block is currently being dragged */
  isDragging?: boolean

  /** Whether edit mode is active (enables drag) */
  isEditing?: boolean

  /** Whether this block is selected */
  isSelected?: boolean

  /** Whether this block just received a drop (for animation) */
  justDropped?: boolean

  /** Whether there's a capacity conflict */
  hasCapacityConflict?: boolean

  /** Click handler */
  onClick?: () => void

  /** Drag start handler */
  onDragStart?: (e: React.DragEvent) => void

  /** Drag end handler */
  onDragEnd?: (e: React.DragEvent) => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BookingBlock({
  booking,
  mode,
  isDragging = false,
  isEditing = false,
  isSelected = false,
  justDropped = false,
  hasCapacityConflict = false,
  onClick,
  onDragStart,
  onDragEnd,
}: BookingBlockProps) {
  const zoneColor = booking.pickupZoneColor || getZoneColor(booking.pickupZoneName)

  // Track local dragging state for immediate visual feedback
  const [isLocalDragging, setIsLocalDragging] = useState(false)

  // Settle animation after drop
  const [showSettleAnimation, setShowSettleAnimation] = useState(false)
  useEffect(() => {
    if (justDropped) {
      setShowSettleAnimation(true)
      const timer = setTimeout(() => setShowSettleAnimation(false), 300)
      return () => clearTimeout(timer)
    }
  }, [justDropped])

  // For timeline mode, calculate position and width
  const timelineStyles = mode === 'timeline' && booking.pickupTime ? {
    left: `${timeToPercent(booking.pickupTime)}%`,
    width: `${Math.max(durationToPercent(booking.tourDurationMinutes), 2)}%`, // Min 2% width for visibility
  } : {}

  return (
    <div
      className={cn(
        "group relative select-none",
        // Base styles
        "rounded-md border bg-card text-card-foreground",
        // Timeline mode - absolute positioning
        mode === 'timeline' && "absolute top-1 bottom-1 min-w-[80px] overflow-hidden",
        // Hopper mode - full width card
        mode === 'hopper' && "w-full p-3",

        // === VISUAL STATES (Phase 3) ===

        // Default state: subtle shadow
        "shadow-sm",

        // Editing mode enabled - show grab cursor and prepare for interaction
        isEditing && !isLocalDragging && [
          "cursor-grab",
          "hover:-translate-y-0.5 hover:shadow-md",
          "hover:ring-1 hover:ring-primary/30",
          "transition-all duration-150 ease-out",
        ],

        // Active dragging state - elevated, slight rotation, reduced opacity
        (isDragging || isLocalDragging) && [
          "!opacity-60",
          "!shadow-xl",
          "!ring-2 !ring-primary",
          "!cursor-grabbing",
          "scale-[1.02] rotate-[0.5deg]",
          "z-50",
        ],

        // Selected state
        isSelected && !isDragging && !isLocalDragging && "ring-2 ring-primary shadow-md",

        // Just dropped - settle animation
        showSettleAnimation && "animate-settle",

        // Capacity conflict warning
        hasCapacityConflict && "ring-2 ring-destructive/50 bg-destructive/5",
      )}
      style={{
        ...timelineStyles,
        borderLeftColor: hasCapacityConflict ? 'hsl(var(--destructive))' : zoneColor,
        borderLeftWidth: '3px',
      }}
      draggable={isEditing}
      onDragStart={(e) => {
        setIsLocalDragging(true)
        e.dataTransfer.setData('text/plain', booking.id)
        e.dataTransfer.setData('application/x-booking', JSON.stringify({
          id: booking.id,
          guideId: booking.guideId,
          pickupTime: booking.pickupTime,
          tourDurationMinutes: booking.tourDurationMinutes,
        }))
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(e)
      }}
      onDragEnd={(e) => {
        setIsLocalDragging(false)
        onDragEnd?.(e)
      }}
      onClick={onClick}
    >
      {mode === 'timeline' ? (
        <TimelineContent booking={booking} zoneColor={zoneColor} hasConflict={hasCapacityConflict} />
      ) : (
        <HopperContent booking={booking} zoneColor={zoneColor} hasConflict={hasCapacityConflict} />
      )}
    </div>
  )
}

// =============================================================================
// TIMELINE CONTENT (Compact view for timeline)
// =============================================================================

interface ContentProps {
  booking: BookingData
  zoneColor: string
  hasConflict?: boolean
}

function TimelineContent({ booking, zoneColor, hasConflict }: ContentProps) {
  return (
    <div className="h-full p-1.5 flex flex-col justify-between text-xs">
      {/* Top row: Customer name + guest count */}
      <div className="flex items-center justify-between gap-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: hasConflict ? 'hsl(var(--destructive))' : zoneColor }}
            title={booking.pickupZoneName || 'Unknown zone'}
          />
          <span className="font-medium truncate">{booking.customerName}</span>
        </div>
        <div className={cn(
          "flex items-center gap-0.5 shrink-0",
          hasConflict ? "text-destructive" : "text-muted-foreground"
        )}>
          {hasConflict && <AlertTriangle className="w-3 h-3" />}
          <Users className="w-3 h-3" />
          <span>{booking.totalParticipants}</span>
        </div>
      </div>

      {/* Bottom row: Pickup info + time */}
      <div className="flex items-center justify-between gap-1 text-muted-foreground min-w-0">
        <span className="truncate">
          {booking.pickupLocation || booking.pickupZoneName || 'No pickup'}
        </span>
        {booking.pickupTime && (
          <span className="shrink-0 font-mono text-[10px]">
            {formatTimeDisplay(booking.pickupTime)}
          </span>
        )}
      </div>

      {/* Special indicators */}
      <SpecialIndicators booking={booking} compact />
    </div>
  )
}

// =============================================================================
// HOPPER CONTENT (Expanded card view for hopper)
// =============================================================================

function HopperContent({ booking, zoneColor, hasConflict }: ContentProps) {
  return (
    <div className="space-y-2">
      {/* Header: Customer name + tour */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: hasConflict ? 'hsl(var(--destructive))' : zoneColor }}
              title={booking.pickupZoneName || 'Unknown zone'}
            />
            <span className="font-medium truncate">{booking.customerName}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {booking.tourName}
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-sm shrink-0",
          hasConflict && "text-destructive"
        )}>
          {hasConflict && <AlertTriangle className="w-4 h-4" />}
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{booking.totalParticipants}</span>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {booking.pickupTime && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimeDisplay(booking.pickupTime)}</span>
          </div>
        )}
        {booking.pickupLocation && (
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{booking.pickupLocation}</span>
          </div>
        )}
      </div>

      {/* Capacity warning */}
      {hasConflict && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Would exceed guide capacity</span>
        </div>
      )}

      {/* Special indicators */}
      <SpecialIndicators booking={booking} />

      {/* Reference number */}
      <div className="text-xs text-muted-foreground/70 font-mono">
        {booking.referenceNumber}
      </div>
    </div>
  )
}

// =============================================================================
// SPECIAL INDICATORS
// =============================================================================

function SpecialIndicators({ booking, compact = false }: { booking: BookingData; compact?: boolean }) {
  if (!booking.specialOccasion && !booking.isFirstTime) return null

  if (compact) {
    // Show just icons for timeline
    return (
      <div className="absolute top-1 right-1 flex gap-0.5">
        {booking.specialOccasion && (
          <Gift className="w-3 h-3 text-pink-500" />
        )}
        {booking.isFirstTime && (
          <Star className="w-3 h-3 text-amber-500" />
        )}
      </div>
    )
  }

  // Full badges for hopper
  return (
    <div className="flex gap-1.5">
      {booking.specialOccasion && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-xs">
          <Gift className="w-3 h-3" />
          {booking.specialOccasion}
        </span>
      )}
      {booking.isFirstTime && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">
          <Star className="w-3 h-3" />
          First visit
        </span>
      )}
    </div>
  )
}

// =============================================================================
// BOOKING BLOCK GROUP (For overlapping bookings)
// =============================================================================

interface BookingBlockGroupProps {
  bookings: BookingData[]
  mode: 'timeline' | 'hopper'
  isEditing?: boolean
  selectedBookingId?: string | null
  onBookingClick?: (booking: BookingData) => void
  onDragStart?: (booking: BookingData, e: React.DragEvent) => void
  onDragEnd?: (booking: BookingData, e: React.DragEvent) => void
}

export function BookingBlockGroup({
  bookings,
  mode,
  isEditing = false,
  selectedBookingId,
  onBookingClick,
  onDragStart,
  onDragEnd,
}: BookingBlockGroupProps) {
  if (bookings.length === 0) return null

  if (mode === 'hopper') {
    // In hopper, just stack them vertically
    return (
      <div className="space-y-2">
        {bookings.map((booking) => (
          <BookingBlock
            key={booking.id}
            booking={booking}
            mode="hopper"
            isEditing={isEditing}
            isSelected={selectedBookingId === booking.id}
            onClick={() => onBookingClick?.(booking)}
            onDragStart={(e) => onDragStart?.(booking, e)}
            onDragEnd={(e) => onDragEnd?.(booking, e)}
          />
        ))}
      </div>
    )
  }

  // In timeline mode, stack overlapping bookings vertically
  // Group bookings by overlap detection using shared utility
  const lanes = layoutBookingsIntoLanes(bookings)

  return (
    <>
      {lanes.map((lane, laneIndex) => (
        <div
          key={laneIndex}
          className="absolute left-0 right-0"
          style={{
            top: `${laneIndex * 50}%`,
            height: `${100 / Math.max(lanes.length, 1)}%`,
          }}
        >
          {lane.map((booking) => (
            <BookingBlock
              key={booking.id}
              booking={booking}
              mode="timeline"
              isEditing={isEditing}
              isSelected={selectedBookingId === booking.id}
              onClick={() => onBookingClick?.(booking)}
              onDragStart={(e) => onDragStart?.(booking, e)}
              onDragEnd={(e) => onDragEnd?.(booking, e)}
            />
          ))}
        </div>
      ))}
    </>
  )
}
