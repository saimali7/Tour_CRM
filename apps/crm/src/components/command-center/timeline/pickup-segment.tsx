"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MapPin, Users, Cake, Star, MessageSquare } from "lucide-react";
import { SegmentWrapper } from "./segment";
import type { PickupSegment as PickupSegmentType } from "./types";
import { formatDuration, formatTimeDisplay, confidenceColors, getZoneColorFromName } from "./types";

// =============================================================================
// TYPES
// =============================================================================

interface PickupSegmentProps {
  /**
   * The pickup segment data
   */
  segment: PickupSegmentType;

  /**
   * Whether this segment is currently selected
   */
  isSelected?: boolean;

  /**
   * Click handler for the segment
   */
  onClick?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// PICKUP SEGMENT COMPONENT
// =============================================================================

/**
 * Pickup segment
 *
 * Represents a customer pickup at a specific location.
 * Colored by confidence level (green/blue/amber/red).
 * Shows location name and guest count.
 * Clickable to show guest details.
 *
 * Symbol: [###] (solid fill with guest count)
 */
export function PickupSegment({
  segment,
  isSelected = false,
  onClick,
  className,
}: PickupSegmentProps) {
  const { booking, pickupLocation, guestCount, confidence } = segment;

  // Use zone color if available, otherwise fall back to confidence colors
  // Zone colors provide geographic visual clustering in the timeline
  const zoneColor = segment.pickupZoneColor || getZoneColorFromName(segment.pickupZoneName);
  const useZoneColor = !!zoneColor && zoneColor !== "#6B7280"; // Don't use fallback gray
  const confidenceClasses = confidenceColors[confidence];

  const customerName = booking.customer
    ? `${booking.customer.firstName} ${booking.customer.lastName}`
    : "Guest";

  const ariaLabel = `Pickup at ${pickupLocation}: ${guestCount} ${guestCount === 1 ? "guest" : "guests"} (${customerName}) at ${formatTimeDisplay(segment.startTime)}`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-full w-full">
            <SegmentWrapper
              type="pickup"
              isSelected={isSelected}
              isInteractive={!!onClick}
              onClick={onClick}
              ariaLabel={ariaLabel}
              className={cn(
                // Full opacity for pickups (important)
                "opacity-90",
                // Shadow for depth
                "shadow-sm",
                // Use confidence colors as fallback when no zone color
                !useZoneColor && confidenceClasses.bg,
                !useZoneColor && confidenceClasses.bgHover,
                !useZoneColor && confidenceClasses.text,
                className
              )}
              style={useZoneColor ? {
                backgroundColor: zoneColor,
                color: "#FFFFFF",
              } : undefined}
            >
              <div className="flex h-full items-center justify-between gap-1 overflow-hidden px-1.5">
                {/* Location and count */}
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                  <MapPin className="h-3 w-3 flex-shrink-0 opacity-80" aria-hidden="true" />
                  <span className="truncate text-[10px] font-medium leading-tight">
                    {segment.pickupZoneName || pickupLocation}
                  </span>
                </div>

                {/* Guest count bubble */}
                <div
                  className={cn(
                    "flex-shrink-0 rounded-full px-1.5 py-0.5",
                    "bg-white/20 text-[10px] font-bold tabular-nums"
                  )}
                >
                  {guestCount}
                </div>

                {/* Special indicators */}
                <div className="flex items-center gap-0.5">
                  {segment.hasSpecialOccasion && (
                    <Cake
                      className="h-2.5 w-2.5 flex-shrink-0 opacity-80"
                      aria-label="Special occasion"
                    />
                  )}
                  {segment.isFirstTimer && (
                    <Star
                      className="h-2.5 w-2.5 flex-shrink-0 opacity-80"
                      aria-label="First-time guest"
                    />
                  )}
                </div>
              </div>
            </SegmentWrapper>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-sm p-0">
          <PickupTooltipContent segment={segment} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

PickupSegment.displayName = "PickupSegment";

// =============================================================================
// PICKUP TOOLTIP CONTENT
// =============================================================================

interface PickupTooltipContentProps {
  segment: PickupSegmentType;
}

/**
 * Rich tooltip content for pickup segments
 * Shows full guest details without requiring a click
 */
function PickupTooltipContent({ segment }: PickupTooltipContentProps) {
  const { booking, pickupLocation, guestCount, confidence } = segment;

  // Use zone color if available for header
  const zoneColor = segment.pickupZoneColor || getZoneColorFromName(segment.pickupZoneName);
  const useZoneColor = !!zoneColor && zoneColor !== "#6B7280";
  const confidenceClasses = confidenceColors[confidence];

  const customerName = booking.customer
    ? `${booking.customer.firstName} ${booking.customer.lastName}`
    : "Guest";

  return (
    <div className="divide-y divide-border">
      {/* Header */}
      <div
        className={cn("px-3 py-2", !useZoneColor && confidenceClasses.bg, !useZoneColor && confidenceClasses.text)}
        style={useZoneColor ? { backgroundColor: zoneColor, color: "#FFFFFF" } : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{customerName}</span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
            {guestCount} {guestCount === 1 ? "guest" : "guests"}
          </span>
        </div>
        <div className="mt-0.5 text-xs opacity-90">
          #{booking.referenceNumber}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 p-3">
        {/* Location */}
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-sm font-medium">{pickupLocation}</div>
            {segment.pickupZoneName && segment.pickupZoneName !== pickupLocation && (
              <div className="text-xs text-muted-foreground">{segment.pickupZoneName}</div>
            )}
          </div>
        </div>

        {/* Time */}
        <div className="text-xs text-muted-foreground">
          Pickup: {formatTimeDisplay(segment.startTime)}
        </div>

        {/* Participant breakdown */}
        <div className="flex items-center gap-2 text-xs">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            {booking.adultCount} {booking.adultCount === 1 ? "Adult" : "Adults"}
            {booking.childCount && booking.childCount > 0 && (
              <>, {booking.childCount} {booking.childCount === 1 ? "Child" : "Children"}</>
            )}
          </span>
        </div>

        {/* Special occasion */}
        {booking.specialOccasion && (
          <div className="flex items-center gap-2 text-xs">
            <Cake className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400">
              {booking.specialOccasion}
            </span>
          </div>
        )}

        {/* First-timer */}
        {segment.isFirstTimer && (
          <div className="flex items-center gap-2 text-xs">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-yellow-600 dark:text-yellow-400">
              First time with us
            </span>
          </div>
        )}

        {/* Special requests */}
        {booking.specialRequests && (
          <div className="flex items-start gap-2 text-xs">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground italic">
              &quot;{booking.specialRequests}&quot;
            </span>
          </div>
        )}

        {/* Pickup notes */}
        {booking.pickupNotes && (
          <div className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            Note: {booking.pickupNotes}
          </div>
        )}
      </div>

      {/* Click hint */}
      <div className="px-3 py-1.5 text-center text-xs text-muted-foreground">
        Click for full details
      </div>
    </div>
  );
}

PickupTooltipContent.displayName = "PickupTooltipContent";

// =============================================================================
// GUEST DOTS COMPONENT (alternative compact display)
// =============================================================================

interface GuestDotsProps {
  count: number;
  maxDots?: number;
  className?: string;
}

/**
 * Displays guest count as dots for compact representation
 * Falls back to number if count exceeds maxDots
 */
export function GuestDots({ count, maxDots = 6, className }: GuestDotsProps) {
  if (count > maxDots) {
    return (
      <span className={cn("font-bold tabular-nums", className)}>
        {count}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${count} ${count === 1 ? "guest" : "guests"}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

GuestDots.displayName = "GuestDots";
