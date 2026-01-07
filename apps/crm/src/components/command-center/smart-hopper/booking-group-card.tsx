"use client"

/**
 * BookingGroupCard Component
 *
 * A card displaying a group of bookings that can be assigned together.
 * - Charter groups show a distinct "CHARTER" badge
 * - Shared groups can be dragged as a whole to assign all bookings
 * - Individual bookings can also be dragged separately
 *
 * Phase 4.4 Enhancements:
 * - Smooth expand/collapse animation
 * - Visual distinction between shared/charter
 * - Guest count badge for large groups
 */

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Users,
  Clock,
  ChevronDown,
  MapPin,
  Lock,
  GripVertical,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { BookingRow } from "./booking-row"
import { formatTimeRange } from "./grouping"
import type { BookingGroup } from "./types"
import type { BookingData } from "../booking-block"

interface BookingGroupCardProps {
  group: BookingGroup
  isEditing: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onDragStart: (group: BookingGroup) => void
  onBookingDragStart: (booking: BookingData) => void
  onBookingClick: (booking: BookingData) => void
}

export function BookingGroupCard({
  group,
  isEditing,
  isExpanded,
  onToggleExpand,
  onDragStart,
  onBookingDragStart,
  onBookingClick,
}: BookingGroupCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)
  const isCharter = group.type === "charter"
  const isLargeGroup = group.totalGuests >= 6

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [group.bookings.length])

  const handleDragStart = (e: React.DragEvent) => {
    // Set data for group drag
    e.dataTransfer.setData("text/plain", group.bookings.map((b) => b.id).join(","))
    e.dataTransfer.setData("groupKey", group.key)
    e.dataTransfer.setData(
      "bookingIds",
      JSON.stringify(group.bookings.map((b) => b.id))
    )
    e.dataTransfer.effectAllowed = "move"
    setIsDragging(true)
    onDragStart(group)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  return (
    <div
      draggable={isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "rounded-lg border bg-card overflow-hidden transition-all duration-200",
        // Charter styling
        isCharter && "border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-transparent",
        // Large group emphasis
        isLargeGroup && !isCharter && "border-primary/30",
        // Drag state
        isDragging && "opacity-50 ring-2 ring-primary scale-[0.98]",
        // Edit mode cursor
        isEditing && "cursor-grab active:cursor-grabbing",
        // Hover lift effect
        isEditing && !isDragging && "hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      {/* Group Header - Always visible */}
      <div
        className={cn(
          "p-3 relative",
          isCharter && "bg-amber-500/5"
        )}
        onClick={onToggleExpand}
      >
        {/* Drag handle (only in edit mode) */}
        {isEditing && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-50">
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {/* Top row: Tour name + time + badge */}
        <div className={cn("flex items-center justify-between gap-2", isEditing && "pl-4")}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-medium truncate">{group.tourName}</span>
            <span className="text-muted-foreground shrink-0">·</span>
            <span className="text-muted-foreground tabular-nums shrink-0">
              {group.tourTime}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Large group indicator */}
            {isLargeGroup && !isCharter && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0"
              >
                {group.totalGuests}
              </Badge>
            )}
            {isCharter && (
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-500 bg-amber-500/10 text-[10px] px-1.5 py-0"
              >
                <Lock className="h-2.5 w-2.5 mr-0.5" />
                CHARTER
              </Badge>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="tabular-nums font-medium text-foreground">
              {group.totalGuests}
            </span>
            <span>guest{group.totalGuests !== 1 ? "s" : ""}</span>
          </span>

          {group.totalBookings > 1 && (
            <span>
              {group.totalBookings} booking{group.totalBookings !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Pickup zones */}
        {group.pickupZones.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {group.pickupZones.map((zone) => (
              <span
                key={zone.name}
                className="px-1.5 py-0.5 text-[10px] rounded inline-flex items-center gap-0.5"
                style={{
                  backgroundColor: zone.color + "20",
                  color: zone.color,
                }}
              >
                <MapPin className="h-2.5 w-2.5" />
                {zone.name}
                <span className="opacity-70">({zone.count})</span>
              </span>
            ))}
          </div>
        )}

        {/* Pickup time range (only if multiple bookings) */}
        {group.totalBookings > 1 && group.earliestPickup && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Pickups: {formatTimeRange(group.earliestPickup, group.latestPickup)}</span>
          </div>
        )}
      </div>

      {/* Expanded booking list with smooth animation */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{
          maxHeight: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="border-t bg-muted/20 px-2 py-1.5 space-y-0.5">
          {group.bookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              isEditing={isEditing}
              onDragStart={() => onBookingDragStart(booking)}
              onClick={() => onBookingClick(booking)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
