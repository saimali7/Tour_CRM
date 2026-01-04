"use client";

import { useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useDraggable, type DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
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
  /** Display mode: "full" shows all details, "compact" shows minimal info */
  displayMode?: "full" | "compact";
  /** Whether this booking has a pending assignment (not yet saved) */
  isPendingAssignment?: boolean;
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
// HELPER - Pluralize
// =============================================================================

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

// =============================================================================
// COMPACT HOPPER CARD
// =============================================================================

function CompactHopperCard({
  booking,
  isSelected,
  isDndDragging,
  zoneColor,
  onClick,
  setNodeRef,
  style,
  attributes,
  listeners,
  isPendingAssignment,
}: {
  booking: HopperBooking;
  isSelected: boolean;
  isDndDragging: boolean;
  zoneColor: string;
  onClick?: () => void;
  setNodeRef: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  isPendingAssignment?: boolean;
}) {
  // Determine special indicators
  const hasSpecialIndicators =
    booking.isVIP ||
    booking.specialOccasion ||
    booking.accessibilityNeeds ||
    (booking.childCount > 0 || booking.infantCount > 0);

  const accessibleLabel = `${booking.customerName}, ${booking.guestCount} ${pluralize(booking.guestCount, "guest")}, ${booking.tourName} at ${booking.tourTime}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(attributes as React.HTMLAttributes<HTMLDivElement>)}
      {...(listeners as React.HTMLAttributes<HTMLDivElement>)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={accessibleLabel}
      aria-grabbed={isDndDragging}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative flex items-center gap-1.5 rounded border bg-card px-1.5 py-1 transition-all duration-150",
        // Pending assignment styling - greyed out, non-draggable
        isPendingAssignment
          ? "opacity-50 cursor-not-allowed pointer-events-none border-emerald-500/50 bg-emerald-500/5"
          : "cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-primary/30",
        "focus:outline-none focus:ring-1 focus:ring-primary",
        isSelected && "ring-1 ring-primary border-primary",
        isDndDragging && "shadow-md opacity-90",
        "touch-manipulation select-none"
      )}
    >
      {/* Zone color indicator */}
      <div
        className="w-0.5 h-5 rounded-full shrink-0"
        style={{ backgroundColor: zoneColor }}
        aria-hidden="true"
      />

      {/* Name - truncated */}
      <span className="text-[11px] font-medium text-foreground truncate min-w-0 flex-1">
        {booking.customerName.split(" ")[0]}
      </span>

      {/* Guest count */}
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground shrink-0">
        {booking.guestCount}
      </span>

      {/* Time */}
      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
        {booking.tourTime}
      </span>

      {/* Zone badge - very compact */}
      {booking.pickupZone && (
        <span
          className="text-[8px] font-semibold shrink-0 px-0.5 rounded"
          style={{
            backgroundColor: `${zoneColor}20`,
            color: zoneColor,
          }}
        >
          {booking.pickupZone.name.slice(0, 3).toUpperCase()}
        </span>
      )}

      {/* Special indicators - icons only */}
      {hasSpecialIndicators && (
        <div className="flex items-center gap-0.5 shrink-0">
          {booking.isVIP && (
            <Star className="h-2.5 w-2.5 text-amber-500" aria-label="VIP" />
          )}
          {booking.specialOccasion && (
            <Cake className="h-2.5 w-2.5 text-pink-500" aria-label={booking.specialOccasion} />
          )}
          {booking.accessibilityNeeds && (
            <Accessibility className="h-2.5 w-2.5 text-purple-500" aria-label={booking.accessibilityNeeds} />
          )}
          {(booking.childCount > 0 || booking.infantCount > 0) && (
            <Baby className="h-2.5 w-2.5 text-blue-500" aria-label="Has children" />
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FULL HOPPER CARD
// =============================================================================

function FullHopperCard({
  booking,
  isSelected,
  isDndDragging,
  zoneColor,
  initials,
  onClick,
  setNodeRef,
  style,
  attributes,
  listeners,
  isPendingAssignment,
}: {
  booking: HopperBooking;
  isSelected: boolean;
  isDndDragging: boolean;
  zoneColor: string;
  initials: string;
  onClick?: () => void;
  setNodeRef: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  isPendingAssignment?: boolean;
}) {
  // Determine if this booking has special indicators
  const hasSpecialIndicators =
    booking.isVIP ||
    booking.isFirstTimer ||
    booking.specialOccasion ||
    booking.accessibilityNeeds ||
    booking.childCount > 0 ||
    booking.infantCount > 0;

  // Accessible label for screen readers
  const accessibleLabel = `${booking.customerName}, ${booking.guestCount} ${pluralize(booking.guestCount, "guest")}, ${booking.tourName} at ${booking.tourTime}${booking.pickupZone ? `, pickup from ${booking.pickupZone.name}` : ""}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(attributes as React.HTMLAttributes<HTMLDivElement>)}
      {...(listeners as React.HTMLAttributes<HTMLDivElement>)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={accessibleLabel}
      aria-grabbed={isDndDragging}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative rounded-md border bg-card p-2 transition-all duration-150",
        // Pending assignment styling - greyed out, non-draggable
        isPendingAssignment
          ? "opacity-50 cursor-not-allowed pointer-events-none border-emerald-500/50 bg-emerald-500/5"
          : "cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-primary/30",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
        isSelected && "ring-2 ring-primary border-primary",
        isDndDragging && "shadow-md opacity-90",
        "touch-manipulation select-none"
      )}
    >
      {/* Zone color indicator bar */}
      <div
        className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
        style={{ backgroundColor: zoneColor }}
        aria-hidden="true"
      />

      <div className="pl-2">
        {/* Header: Customer name + pax count */}
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[10px] font-medium bg-muted">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate leading-tight">
                {booking.customerName}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {booking.referenceNumber}
              </p>
            </div>
          </div>

          {/* Guest count badge */}
          <Badge variant="secondary" className="shrink-0 text-[10px] h-5 px-1.5">
            <Users className="h-2.5 w-2.5 mr-0.5" />
            {booking.guestCount}
          </Badge>

          {/* Pending assignment indicator */}
          {isPendingAssignment && (
            <Badge variant="outline" className="shrink-0 text-[9px] h-4 px-1 border-emerald-500 text-emerald-600 bg-emerald-500/10">
              Assigned
            </Badge>
          )}
        </div>

        {/* Tour info */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          <Clock className="h-2.5 w-2.5" />
          <span className="font-mono">{booking.tourTime}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="truncate">{booking.tourName}</span>
        </div>

        {/* Zone badge */}
        {booking.pickupZone && (
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className="text-[9px] font-medium h-4 px-1"
              style={{
                borderColor: zoneColor,
                color: zoneColor,
                backgroundColor: `${zoneColor}10`,
              }}
            >
              <MapPin className="h-2 w-2 mr-0.5" />
              {booking.pickupZone.name}
            </Badge>

            {booking.pickupTime && (
              <span className="text-[9px] text-muted-foreground font-mono">
                {booking.pickupTime}
              </span>
            )}
          </div>
        )}

        {/* Special indicators */}
        {hasSpecialIndicators && (
          <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border/50">
            {booking.isVIP && (
              <span
                className="inline-flex items-center justify-center h-4 w-4 rounded bg-amber-500/10 text-amber-500"
                title="VIP"
              >
                <Star className="h-2.5 w-2.5" />
              </span>
            )}
            {(booking.childCount > 0 || booking.infantCount > 0) && (
              <span
                className="inline-flex items-center justify-center h-4 w-4 rounded bg-blue-500/10 text-blue-500"
                title="Has children"
              >
                <Baby className="h-2.5 w-2.5" />
              </span>
            )}
            {booking.specialOccasion && (
              <span
                className="inline-flex items-center justify-center h-4 w-4 rounded bg-pink-500/10 text-pink-500"
                title={booking.specialOccasion}
              >
                <Cake className="h-2.5 w-2.5" />
              </span>
            )}
            {booking.accessibilityNeeds && (
              <span
                className="inline-flex items-center justify-center h-4 w-4 rounded bg-purple-500/10 text-purple-500"
                title={booking.accessibilityNeeds}
              >
                <Accessibility className="h-2.5 w-2.5" />
              </span>
            )}
            {booking.isFirstTimer && (
              <span className="text-[9px] text-blue-500 font-medium">1st</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// DRAGGABLE HOPPER CARD
// =============================================================================

export function HopperCard({
  booking,
  isSelected = false,
  isDragging = false,
  onClick,
  displayMode = "full",
  isPendingAssignment = false,
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
    if (!booking.customerName) return "?";
    const parts = booking.customerName.split(" ");
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    return (parts[0]?.[0] ?? "?").toUpperCase();
  }, [booking.customerName]);

  const sharedProps = {
    booking,
    isSelected,
    isDndDragging: isDragging || isDndDragging,
    zoneColor,
    onClick,
    setNodeRef,
    style,
    attributes,
    listeners,
    isPendingAssignment,
  };

  if (displayMode === "compact") {
    return <CompactHopperCard {...sharedProps} />;
  }

  return <FullHopperCard {...sharedProps} initials={initials} />;
}

HopperCard.displayName = "HopperCard";
