/**
 * Segment Content Components
 *
 * Visual rendering components for different segment types in the timeline.
 * Extracted from segment-lane.tsx for better maintainability.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Users, MapPin, Calendar, Car, Cake, Star } from "lucide-react";
import type { TimelineSegment } from "./types";
import { formatTimeDisplay, formatDuration, confidenceColors, getZoneColorFromName } from "./types";

// =============================================================================
// TOUR CONTENT
// =============================================================================

interface TourContentProps {
  segment: Extract<TimelineSegment, { type: "tour" }>;
  displayStartTime?: string;
  displayEndTime?: string;
}

export function TourContent({ segment, displayStartTime }: TourContentProps) {
  const colors = confidenceColors[segment.confidence];
  // Use display times if provided (for time-shifted segments)
  const startTime = formatTimeDisplay(displayStartTime ?? segment.startTime);

  return (
    <div
      className={cn(
        "h-full w-full rounded-sm segment-container",
        colors.bg,
        "text-white shadow-md",
        "bg-gradient-to-b from-white/10 to-transparent"
      )}
    >
      <div className="flex h-full flex-col justify-center overflow-hidden px-2 py-1">
        <div className="flex items-center gap-1.5">
          <Calendar className="segment-icon h-3 w-3 shrink-0 opacity-80" />
          <span className="segment-label truncate text-xs font-semibold">{segment.tour.name}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] opacity-80">
          <span className="segment-time tabular-nums">{startTime}</span>
          <span className="segment-guests flex items-center gap-0.5">
            <Users className="h-2.5 w-2.5" />
            <span className="tabular-nums">{segment.totalGuests}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function TourTooltip({ segment, displayStartTime, displayEndTime }: TourContentProps) {
  const colors = confidenceColors[segment.confidence];
  // Use display times if provided (for time-shifted segments)
  const startTime = formatTimeDisplay(displayStartTime ?? segment.startTime);
  const endTime = formatTimeDisplay(displayEndTime ?? segment.endTime);

  return (
    <div className="divide-y divide-border">
      <div className={cn("px-3 py-2", colors.bg, "text-white")}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{segment.tour.name}</span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
            {segment.totalGuests} guests
          </span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{startTime} - {endTime}</span>
          <span className="text-muted-foreground">({formatDuration(segment.durationMinutes)})</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PICKUP CONTENT
// =============================================================================

interface PickupContentProps {
  segment: Extract<TimelineSegment, { type: "pickup" }>;
  displayStartTime?: string;
}

export function PickupContent({ segment }: PickupContentProps) {
  const zoneColor = segment.pickupZoneColor || getZoneColorFromName(segment.pickupZoneName);
  const useZoneColor = !!zoneColor && zoneColor !== "#6B7280";
  const colors = confidenceColors[segment.confidence];

  return (
    <div
      className={cn(
        "h-full w-full rounded-sm shadow-sm segment-container",
        !useZoneColor && colors.bg,
        !useZoneColor && "text-white"
      )}
      style={useZoneColor ? { backgroundColor: zoneColor, color: "#FFFFFF" } : undefined}
    >
      <div className="flex h-full items-center justify-between gap-1 overflow-hidden px-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <MapPin className="segment-icon h-3 w-3 shrink-0 opacity-80" />
          <span className="segment-label truncate text-[10px] font-medium">
            {segment.pickupZoneName || segment.pickupLocation}
          </span>
        </div>
        <div className="segment-guests shrink-0 rounded-full px-1.5 py-0.5 bg-white/20 text-[10px] font-bold tabular-nums">
          {segment.guestCount}
        </div>
        {(segment.hasSpecialOccasion || segment.isFirstTimer) && (
          <div className="flex items-center gap-0.5">
            {segment.hasSpecialOccasion && <Cake className="h-2.5 w-2.5 opacity-80" />}
            {segment.isFirstTimer && <Star className="h-2.5 w-2.5 opacity-80" />}
          </div>
        )}
      </div>
    </div>
  );
}

export function PickupTooltip({ segment, displayStartTime }: PickupContentProps) {
  const zoneColor = segment.pickupZoneColor || getZoneColorFromName(segment.pickupZoneName);
  const useZoneColor = !!zoneColor && zoneColor !== "#6B7280";
  const colors = confidenceColors[segment.confidence];
  const customerName = segment.booking.customer
    ? `${segment.booking.customer.firstName} ${segment.booking.customer.lastName}`
    : "Guest";
  // Use display time if provided (for time-shifted segments)
  const pickupTime = formatTimeDisplay(displayStartTime ?? segment.startTime);

  return (
    <div className="divide-y divide-border">
      <div
        className={cn("px-3 py-2", !useZoneColor && colors.bg, !useZoneColor && "text-white")}
        style={useZoneColor ? { backgroundColor: zoneColor, color: "#FFFFFF" } : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{customerName}</span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
            {segment.guestCount} guests
          </span>
        </div>
        <div className="mt-0.5 text-xs opacity-90">#{segment.booking.referenceNumber}</div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-sm font-medium">{segment.pickupLocation}</div>
            {segment.pickupZoneName && segment.pickupZoneName !== segment.pickupLocation && (
              <div className="text-xs text-muted-foreground">{segment.pickupZoneName}</div>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Pickup: {pickupTime}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            {segment.booking.adultCount} {segment.booking.adultCount === 1 ? "Adult" : "Adults"}
            {segment.booking.childCount && segment.booking.childCount > 0 && (
              <>, {segment.booking.childCount} {segment.booking.childCount === 1 ? "Child" : "Children"}</>
            )}
          </span>
        </div>
        {segment.booking.specialOccasion && (
          <div className="flex items-center gap-2 text-xs">
            <Cake className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-amber-600">{segment.booking.specialOccasion}</span>
          </div>
        )}
        {segment.isFirstTimer && (
          <div className="flex items-center gap-2 text-xs">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-yellow-600">First time with us</span>
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 text-center text-xs text-muted-foreground">
        Click for full details
      </div>
    </div>
  );
}

// =============================================================================
// DRIVE CONTENT
// =============================================================================

interface DriveContentProps {
  segment: Extract<TimelineSegment, { type: "drive" }>;
}

export function DriveContent({ segment }: DriveContentProps) {
  return (
    <div className="flex h-full items-center">
      <div className="h-3 w-full rounded-full bg-muted-foreground/30">
        {segment.durationMinutes >= 10 && (
          <div className="flex h-full items-center justify-center">
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground/80 whitespace-nowrap">
              <Car className="h-2.5 w-2.5" />
              <span className="tabular-nums">{formatDuration(segment.durationMinutes)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DriveTooltip({ segment }: DriveContentProps) {
  return (
    <div className="p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <Car className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">Drive Time</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
          {formatDuration(segment.durationMinutes)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {formatTimeDisplay(segment.startTime)} - {formatTimeDisplay(segment.endTime)}
      </div>
    </div>
  );
}

// =============================================================================
// IDLE CONTENT
// =============================================================================

interface IdleContentProps {
  segment: Extract<TimelineSegment, { type: "idle" }>;
}

export function IdleContent({ segment }: IdleContentProps) {
  const showLabel = segment.durationMinutes >= 30;

  return (
    <div className={cn(
      "h-full w-full rounded-sm",
      "bg-gradient-to-r from-muted/20 via-muted/30 to-muted/20",
      "border border-dashed border-muted-foreground/15",
      "transition-all duration-200",
      "hover:bg-muted/40 hover:border-muted-foreground/25"
    )}>
      {showLabel && (
        <div className="flex h-full items-center justify-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground/50 select-none tracking-wide">
            Available
          </span>
          {segment.durationMinutes >= 60 && (
            <span className="text-[9px] text-muted-foreground/40 font-mono tabular-nums">
              {formatDuration(segment.durationMinutes)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function IdleTooltip({ segment }: IdleContentProps) {
  return (
    <div className="p-3 space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">Available</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {formatDuration(segment.durationMinutes)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {formatTimeDisplay(segment.startTime)} - {formatTimeDisplay(segment.endTime)}
      </div>
    </div>
  );
}
