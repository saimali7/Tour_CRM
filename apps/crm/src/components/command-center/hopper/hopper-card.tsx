"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Baby, Star, Cake, Accessibility, Users, MapPin, Lock, Sparkles } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export type ExperienceMode = "join" | "book" | "charter";

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
  tourDurationMinutes?: number;
  /** Experience mode: join (shared), book (exclusive), charter (private) */
  experienceMode?: ExperienceMode;
  isVIP?: boolean;
  isFirstTimer?: boolean;
  specialOccasion?: string | null;
  accessibilityNeeds?: string | null;
  hasChildren?: boolean;
}

interface HopperCardProps {
  booking: HopperBooking;
  isSelected?: boolean;
  onClick?: () => void;
  isPendingAssignment?: boolean;
  /** When true, use click-based selection instead of drag-and-drop */
  isClickMode?: boolean;
}

// =============================================================================
// ZONE COLOR UTILS
// =============================================================================

const ZONE_COLORS: Record<string, string> = {
  jbr: "#8B5CF6",
  marina: "#0EA5E9",
  downtown: "#F97316",
  palm: "#10B981",
  business: "#3B82F6",
  airport: "#64748B",
  beach: "#06B6D4",
  creek: "#14B8A6",
  old: "#EAB308",
  jumeirah: "#EC4899",
};

function getZoneColor(zone: HopperBooking["pickupZone"]): string {
  if (zone?.color) return zone.color;

  if (zone?.name) {
    const nameLower = zone.name.toLowerCase();
    for (const [key, color] of Object.entries(ZONE_COLORS)) {
      if (nameLower.includes(key)) return color;
    }
  }

  return "#6B7280";
}

// =============================================================================
// HOPPER CARD
// =============================================================================

export function HopperCard({
  booking,
  isSelected = false,
  onClick,
  isPendingAssignment = false,
  isClickMode = false,
}: HopperCardProps) {
  // Only use drag-and-drop when NOT in click mode
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: booking.id,
    data: {
      type: "hopper-booking",
      booking,
    },
    disabled: isPendingAssignment || isClickMode,
  });

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const zoneColor = useMemo(() => getZoneColor(booking.pickupZone), [booking.pickupZone]);

  const isPrivate = booking.experienceMode === "book" || booking.experienceMode === "charter";

  const hasSpecialIndicators =
    booking.isVIP ||
    booking.isFirstTimer ||
    booking.specialOccasion ||
    booking.accessibilityNeeds ||
    booking.childCount > 0 ||
    booking.infantCount > 0;

  // In click mode, don't apply drag listeners
  const dragProps = isClickMode
    ? {}
    : {
        ...(attributes as React.HTMLAttributes<HTMLDivElement>),
        ...(listeners as React.HTMLAttributes<HTMLDivElement>),
      };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative flex items-center gap-2 rounded-lg border bg-card p-2.5 transition-all duration-150",
        isPendingAssignment
          ? "opacity-50 cursor-not-allowed pointer-events-none border-green-500/30 bg-green-500/5"
          : isClickMode
            ? "cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
            : "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        // Selected state in click mode - amber ring for "ready to assign"
        isSelected && isClickMode && "ring-2 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-950/20",
        // Selected state in drag mode
        isSelected && !isClickMode && "ring-2 ring-primary border-primary",
        isDragging && "shadow-lg scale-[1.02]"
      )}
    >
      {/* Zone color bar */}
      <div
        className="w-1 h-10 rounded-full shrink-0"
        style={{ backgroundColor: zoneColor }}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {booking.customerName}
          </span>

          {/* Private indicator */}
          {isPrivate && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded shrink-0">
              <Lock className="h-2.5 w-2.5" />
              {booking.experienceMode === "charter" ? "Charter" : "Private"}
            </span>
          )}

          {/* Special indicators - inline, compact */}
          {hasSpecialIndicators && (
            <div className="flex items-center gap-0.5 shrink-0">
              {booking.isFirstTimer && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                  <Sparkles className="h-2.5 w-2.5" />
                  NEW
                </span>
              )}
              {booking.isVIP && (
                <Star className="h-3 w-3 text-amber-500" />
              )}
              {booking.specialOccasion && (
                <Cake className="h-3 w-3 text-pink-500" />
              )}
              {booking.accessibilityNeeds && (
                <Accessibility className="h-3 w-3 text-purple-500" />
              )}
              {(booking.childCount > 0 || booking.infantCount > 0) && (
                <Baby className="h-3 w-3 text-blue-500" />
              )}
            </div>
          )}
        </div>

        {/* Zone row */}
        <div className="flex items-center gap-1.5 mt-1">
          {booking.pickupZone ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${zoneColor}15`,
                color: zoneColor,
              }}
            >
              <MapPin className="h-2.5 w-2.5" />
              {booking.pickupZone.name}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">No zone</span>
          )}

          {isPendingAssignment && (
            <span className="text-[10px] font-medium text-green-600 dark:text-green-400 ml-auto">
              Assigned
            </span>
          )}
        </div>
      </div>

      {/* Guest count - prominent on right */}
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-md shrink-0",
          "bg-primary/10 text-primary"
        )}
      >
        <Users className="h-3.5 w-3.5" />
        <span className="text-sm font-bold tabular-nums">{booking.guestCount}</span>
      </div>
    </div>
  );
}

HopperCard.displayName = "HopperCard";
