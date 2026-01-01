"use client";

import { cn } from "@/lib/utils";
import { Users, MapPin, Star, Lock, GripVertical } from "lucide-react";
import { ZoneBadge } from "./zone-badge";
import { forwardRef } from "react";

export interface BookingCardData {
  id: string;
  bookingId: string;
  customerName: string;
  guestCount: number;
  zone?: string | null;
  pickupAddress?: string | null;
  isPrivate: boolean;
  assignedGuideId?: string | null;
  suggestion?: {
    guideId: string;
    guideName: string;
    reason: string;
  } | null;
}

interface BookingCardProps {
  booking: BookingCardData;
  isDragging?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export const BookingCard = forwardRef<HTMLDivElement, BookingCardProps>(
  function BookingCard({ booking, isDragging, isSelected, onSelect, className }, ref) {
    const isAssigned = !!booking.assignedGuideId;

    return (
      <div
        ref={ref}
        onClick={onSelect}
        className={cn(
          "group relative flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
          "hover:border-primary/30 hover:bg-muted/30",
          isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
          isDragging && "opacity-50 border-dashed border-primary shadow-lg",
          isAssigned && "opacity-60 bg-muted/20",
          !isDragging && !isAssigned && "bg-card border-border",
          className
        )}
      >
        {/* Drag Handle */}
        <div
          className={cn(
            "flex-shrink-0 flex items-center justify-center w-5 h-full cursor-grab active:cursor-grabbing",
            "text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header: Customer name + badges */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">
              {booking.customerName}
            </span>
            {booking.isPrivate && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Lock className="h-2.5 w-2.5" />
                Private
              </span>
            )}
          </div>

          {/* Meta: Guests + Zone + Pickup */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {/* Guest count */}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="font-medium tabular-nums">{booking.guestCount}</span>
            </span>

            {/* Zone badge */}
            {booking.zone && <ZoneBadge zone={booking.zone} size="sm" />}

            {/* Pickup location */}
            {booking.pickupAddress && (
              <span className="inline-flex items-center gap-1 truncate max-w-[120px]">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{booking.pickupAddress}</span>
              </span>
            )}
          </div>

          {/* Suggestion */}
          {booking.suggestion && !isAssigned && (
            <div className="flex items-center gap-1.5 pt-1">
              <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">{booking.suggestion.guideName}</span>
                {" · "}
                {booking.suggestion.reason}
              </span>
            </div>
          )}
        </div>

        {/* Right side: guest count badge (alternate compact view) */}
        <div
          className={cn(
            "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg",
            "bg-muted/50 text-muted-foreground",
            isAssigned && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          )}
        >
          <span className="text-sm font-semibold tabular-nums">{booking.guestCount}</span>
        </div>
      </div>
    );
  }
);

// Ghost preview version for drag operations
export function BookingCardGhost({
  booking,
  impactWarning,
}: {
  booking: BookingCardData;
  impactWarning?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 border-dashed",
        impactWarning
          ? "border-amber-500 bg-amber-500/5"
          : "border-primary bg-primary/5"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground truncate">
            {booking.customerName}
          </span>
          <span className="text-xs text-muted-foreground">
            <Users className="h-3 w-3 inline mr-1" />
            {booking.guestCount}
          </span>
        </div>
        {impactWarning && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
            {impactWarning}
          </p>
        )}
      </div>
    </div>
  );
}
