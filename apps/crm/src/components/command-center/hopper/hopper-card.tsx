"use client";

import { useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useDraggable, type DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { CSS } from "@dnd-kit/utilities";
import { Baby, Star, Cake, Accessibility, Clock, Users, MapPin, Sparkles, GripVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  /** Tour duration in minutes (for timeline display) */
  tourDurationMinutes?: number;
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
 * Default zone colors - DISTINCT categorical palette
 * Matches types.ts palette for consistency
 */
const DEFAULT_ZONE_COLORS: Record<string, string> = {
  jbr: "#8B5CF6", // Violet - premium beach area
  marina: "#0EA5E9", // Sky blue - waterfront
  downtown: "#F97316", // Orange - urban core
  palm: "#10B981", // Emerald - island greenery
  business: "#3B82F6", // Blue - corporate district
  airport: "#64748B", // Slate - transit hub
  beach: "#06B6D4", // Cyan - coastal
  creek: "#14B8A6", // Teal - historic waterway
  old: "#EAB308", // Yellow - heritage district
  jumeirah: "#EC4899", // Pink - luxury residential
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
        "group relative flex items-center gap-1.5 rounded border bg-card px-1.5 py-1 transition-all duration-150 ease-out",
        // Pending assignment styling - greyed out, non-draggable
        isPendingAssignment
          ? "opacity-50 cursor-not-allowed pointer-events-none border-emerald-500/50 bg-emerald-500/5"
          : "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
        "focus:outline-none focus:ring-1 focus:ring-primary",
        isSelected && "ring-1 ring-primary border-primary",
        isDndDragging && "shadow-lg opacity-90 scale-[1.02]",
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
        "group relative rounded-lg border bg-card p-3 transition-all duration-150 ease-out",
        // Pending assignment styling - greyed out, non-draggable
        isPendingAssignment
          ? "opacity-50 cursor-not-allowed pointer-events-none border-emerald-500/50 bg-emerald-500/5"
          : "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
        isSelected && "ring-2 ring-primary border-primary",
        isDndDragging && "shadow-lg opacity-90 scale-[1.02]",
        "touch-manipulation select-none"
      )}
    >
      {/* ===== PRIMARY ROW: Grip + Avatar + Customer Name + Guest Count ===== */}
      <div className="flex items-center gap-2">
        {/* Drag Handle - visible affordance for dragging */}
        {!isPendingAssignment && (
          <div className="flex-shrink-0 -ml-1 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </div>
        )}

        {/* Avatar with zone color ring */}
        <Avatar
          className="h-8 w-8 shrink-0 ring-2 ring-offset-1 ring-offset-card"
          style={{ "--tw-ring-color": zoneColor } as React.CSSProperties}
        >
          <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Customer name + reference (reference demoted) */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {booking.customerName}
          </p>
          <p className="text-[9px] text-muted-foreground/50 font-mono tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
            {booking.referenceNumber}
          </p>
        </div>

        {/* Guest count badge - prominent on right */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-1">
            <Users className="h-3.5 w-3.5" />
            <span className="text-sm font-bold tabular-nums">{booking.guestCount}</span>
          </div>
          {isPendingAssignment && (
            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              Assigned
            </span>
          )}
        </div>
      </div>

      {/* ===== SECONDARY ROW: Time + Tour Name ===== */}
      <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" />
        <span className="font-mono font-medium text-foreground/80">{booking.tourTime}</span>
        <span className="text-muted-foreground/40">|</span>
        <span className="truncate">{booking.tourName}</span>
      </div>

      {/* ===== TERTIARY ROW: Zone + Indicators ===== */}
      <div className="flex items-center gap-1.5 mt-2">
        {/* Zone pill - compact, color-coded */}
        {booking.pickupZone && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: `${zoneColor}15`,
              color: zoneColor,
            }}
          >
            <MapPin className="h-2.5 w-2.5" />
            {booking.pickupZone.name}
          </span>
        )}

        {/* Pickup time if different from tour time */}
        {booking.pickupTime && booking.pickupTime !== booking.tourTime && (
          <span className="text-[10px] text-muted-foreground/70 font-mono">
            @ {booking.pickupTime}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Special indicators - inline, no border separator */}
        {hasSpecialIndicators && (
          <div className="flex items-center gap-1">
            {(booking.childCount > 0 || booking.infantCount > 0) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/10 text-blue-500">
                    <Baby className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {booking.childCount > 0 && `${booking.childCount} ${pluralize(booking.childCount, "child", "children")}`}
                  {booking.childCount > 0 && booking.infantCount > 0 && ", "}
                  {booking.infantCount > 0 && `${booking.infantCount} ${pluralize(booking.infantCount, "infant")}`}
                </TooltipContent>
              </Tooltip>
            )}
            {booking.isFirstTimer && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Sparkles className="h-3 w-3" />
                    <span className="text-[10px] font-semibold">NEW</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  First time guest
                </TooltipContent>
              </Tooltip>
            )}
            {booking.isVIP && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/10 text-amber-500">
                    <Star className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">VIP Guest</TooltipContent>
              </Tooltip>
            )}
            {booking.specialOccasion && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-pink-500/10 text-pink-500">
                    <Cake className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{booking.specialOccasion}</TooltipContent>
              </Tooltip>
            )}
            {booking.accessibilityNeeds && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-500/10 text-purple-500">
                    <Accessibility className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{booking.accessibilityNeeds}</TooltipContent>
              </Tooltip>
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
