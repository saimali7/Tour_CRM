"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Baby, Star, Cake, Accessibility, Clock, Users, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// =============================================================================
// TYPES
// =============================================================================

export interface HopperBooking {
  id: string;
  referenceNumber: string;
  customerName: string;
  customerEmail: string | null;
  guestCount: number;
  adultCount: number;
  childCount: number;
  infantCount: number;
  pickupZone: {
    id: string;
    name: string;
    color: string;
  } | null;
  pickupLocation: string | null;
  pickupTime: string | null;
  tourName: string;
  tourTime: string;
  tourRunKey: string;
  // Special indicators
  isVIP?: boolean;
  isFirstTimer?: boolean;
  specialOccasion?: string | null;
  accessibilityNeeds?: string | null;
  hasChildren?: boolean;
}

interface HopperCardProps {
  booking: HopperBooking;
  isSelected?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
}

// =============================================================================
// ZONE COLOR UTILS
// =============================================================================

/**
 * Default zone colors based on feature doc spec
 */
const DEFAULT_ZONE_COLORS: Record<string, string> = {
  marina: "#0EA5E9", // Teal - coastal/water
  downtown: "#F97316", // Orange - urban/energy
  palm: "#22C55E", // Green - palm tree
  jbr: "#8B5CF6", // Purple - luxury
  business: "#3B82F6", // Blue - corporate
};

/**
 * Get zone color with fallback
 */
function getZoneColor(zone: HopperBooking["pickupZone"]): string {
  if (zone?.color) return zone.color;

  // Try to match by name
  if (zone?.name) {
    const nameLower = zone.name.toLowerCase();
    for (const [key, color] of Object.entries(DEFAULT_ZONE_COLORS)) {
      if (nameLower.includes(key)) return color;
    }
  }

  return "#6B7280"; // Gray fallback
}

// =============================================================================
// DRAGGABLE HOPPER CARD
// =============================================================================

export function HopperCard({
  booking,
  isSelected = false,
  isDragging = false,
  onClick,
}: HopperCardProps) {
  // Set up draggable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDndDragging,
  } = useDraggable({
    id: booking.id,
    data: {
      type: "hopper-booking",
      booking,
    },
  });

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        opacity: isDndDragging ? 0.5 : 1,
      }
    : undefined;

  const zoneColor = useMemo(() => getZoneColor(booking.pickupZone), [booking.pickupZone]);

  const initials = useMemo(() => {
    const parts = booking.customerName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
    }
    return (parts[0]?.[0] || "?").toUpperCase();
  }, [booking.customerName]);

  // Determine if this booking has special indicators
  const hasSpecialIndicators =
    booking.isVIP ||
    booking.isFirstTimer ||
    booking.specialOccasion ||
    booking.accessibilityNeeds ||
    booking.hasChildren ||
    (booking.childCount > 0 || booking.infantCount > 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative rounded-lg border bg-card p-3 transition-all duration-150 cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-primary/30",
        isSelected && "ring-2 ring-primary border-primary",
        (isDragging || isDndDragging) && "shadow-lg opacity-90",
        "touch-manipulation select-none"
      )}
    >
      {/* Zone color indicator bar */}
      <div
        className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
        style={{ backgroundColor: zoneColor }}
        aria-hidden="true"
      />

      <div className="pl-3">
        {/* Header: Customer name + pax count */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px] font-medium bg-muted">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {booking.customerName}
              </p>
              <p className="text-xs text-muted-foreground">
                {booking.referenceNumber}
              </p>
            </div>
          </div>

          {/* Guest count badge */}
          <Badge
            variant="secondary"
            className="shrink-0 text-xs tabular-nums"
          >
            <Users className="h-3 w-3 mr-1" />
            {booking.guestCount}
          </Badge>
        </div>

        {/* Tour info */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Clock className="h-3 w-3" />
          <span className="truncate">{booking.tourTime}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="truncate">{booking.tourName}</span>
        </div>

        {/* Zone badge */}
        {booking.pickupZone && (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] font-medium"
              style={{
                borderColor: zoneColor,
                color: zoneColor,
                backgroundColor: `${zoneColor}10`,
              }}
            >
              <MapPin className="h-2.5 w-2.5 mr-1" />
              {booking.pickupZone.name}
            </Badge>

            {booking.pickupTime && (
              <span className="text-[10px] text-muted-foreground">
                {booking.pickupTime}
              </span>
            )}
          </div>
        )}

        {/* Special indicators */}
        {hasSpecialIndicators && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50">
            {booking.isVIP && (
              <span
                className="inline-flex items-center justify-center h-5 w-5 rounded bg-amber-500/10 text-amber-500"
                title="VIP"
              >
                <Star className="h-3 w-3" />
              </span>
            )}
            {(booking.hasChildren || booking.childCount > 0 || booking.infantCount > 0) && (
              <span
                className="inline-flex items-center justify-center h-5 w-5 rounded bg-blue-500/10 text-blue-500"
                title="Has children"
              >
                <Baby className="h-3 w-3" />
              </span>
            )}
            {booking.specialOccasion && (
              <span
                className="inline-flex items-center justify-center h-5 w-5 rounded bg-pink-500/10 text-pink-500"
                title={booking.specialOccasion}
              >
                <Cake className="h-3 w-3" />
              </span>
            )}
            {booking.accessibilityNeeds && (
              <span
                className="inline-flex items-center justify-center h-5 w-5 rounded bg-purple-500/10 text-purple-500"
                title={booking.accessibilityNeeds}
              >
                <Accessibility className="h-3 w-3" />
              </span>
            )}
            {booking.isFirstTimer && (
              <span className="text-[10px] text-blue-500 font-medium">
                1st time
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

HopperCard.displayName = "HopperCard";
