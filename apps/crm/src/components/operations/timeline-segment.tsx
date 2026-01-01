"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Car, Users, MapPin, Navigation } from "lucide-react";
import { getZoneColor, getZoneAccent } from "./zone-badge";

export type SegmentType = "drive" | "pickup" | "tour";

export interface TimelineSegmentData {
  id: string;
  type: SegmentType;
  startTime: Date | string;
  endTime: Date | string;
  // For pickup segments
  customerName?: string;
  guestCount?: number;
  zone?: string | null;
  pickupAddress?: string | null;
  bookingId?: string;
  // For tour segments
  tourName?: string;
  // For drive segments
  durationMinutes?: number;
  distanceKm?: number;
}

interface TimelineSegmentProps {
  segment: TimelineSegmentData;
  hourWidth: number; // pixels per hour
  startHour: number; // timeline start hour (e.g., 6 for 6:00 AM)
  isGhost?: boolean;
  className?: string;
}

export function TimelineSegment({
  segment,
  hourWidth,
  startHour,
  isGhost,
  className,
}: TimelineSegmentProps) {
  const startTime = new Date(segment.startTime);
  const endTime = new Date(segment.endTime);

  // Calculate position and width
  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
  const startOffset = startMinutes - startHour * 60;
  const duration = endMinutes - startMinutes;

  const left = (startOffset / 60) * hourWidth;
  const width = Math.max((duration / 60) * hourWidth, 24); // Min 24px width

  const baseStyles = cn(
    "absolute top-1 bottom-1 rounded-md transition-all overflow-hidden",
    "flex items-center justify-center text-[10px] font-medium",
    isGhost && "border-2 border-dashed opacity-70"
  );

  const typeStyles = {
    drive: cn(
      "bg-muted/60 text-muted-foreground border border-border/50",
      isGhost && "border-muted-foreground"
    ),
    pickup: cn(
      getZoneColor(segment.zone),
      "border border-current/20",
      isGhost && "border-current"
    ),
    tour: cn(
      "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
      isGhost && "border-emerald-500"
    ),
  };

  const renderContent = () => {
    if (width < 48) {
      // Very compact - icon only
      return (
        <div className="flex items-center justify-center">
          {segment.type === "drive" && <Car className="h-3 w-3" />}
          {segment.type === "pickup" && <MapPin className="h-3 w-3" />}
          {segment.type === "tour" && <Navigation className="h-3 w-3" />}
        </div>
      );
    }

    if (width < 80) {
      // Compact - icon + minimal info
      return (
        <div className="flex items-center gap-1 px-1.5 truncate">
          {segment.type === "drive" && (
            <>
              <Car className="h-3 w-3 flex-shrink-0" />
              <span>{segment.durationMinutes}m</span>
            </>
          )}
          {segment.type === "pickup" && (
            <>
              <Users className="h-3 w-3 flex-shrink-0" />
              <span>{segment.guestCount}</span>
            </>
          )}
          {segment.type === "tour" && (
            <>
              <Navigation className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{segment.tourName}</span>
            </>
          )}
        </div>
      );
    }

    // Full content
    return (
      <div className="flex items-center gap-1.5 px-2 truncate">
        {segment.type === "drive" && (
          <>
            <Car className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{segment.durationMinutes}m</span>
            {segment.distanceKm && (
              <span className="opacity-70">· {segment.distanceKm.toFixed(1)}km</span>
            )}
          </>
        )}
        {segment.type === "pickup" && (
          <>
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-semibold truncate">{segment.customerName}</span>
            <span className="opacity-70">· {segment.guestCount} pax</span>
          </>
        )}
        {segment.type === "tour" && (
          <>
            <Navigation className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-semibold truncate">{segment.tourName}</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(baseStyles, typeStyles[segment.type], className)}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
      title={`${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}: ${
        segment.type === "pickup"
          ? segment.customerName
          : segment.type === "tour"
            ? segment.tourName
            : "Drive"
      }`}
    >
      {renderContent()}
    </div>
  );
}

// Time markers for the timeline header
export function TimelineHeader({
  startHour,
  endHour,
  hourWidth,
  className,
}: {
  startHour: number;
  endHour: number;
  hourWidth: number;
  className?: string;
}) {
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div className={cn("relative h-6 border-b border-border", className)}>
      {hours.map((hour, idx) => (
        <div
          key={hour}
          className="absolute top-0 bottom-0 flex items-center"
          style={{ left: `${idx * hourWidth}px` }}
        >
          <div className="w-px h-full bg-border" />
          <span className="ml-1 text-[10px] font-mono text-muted-foreground tabular-nums">
            {hour.toString().padStart(2, "0")}:00
          </span>
        </div>
      ))}
    </div>
  );
}
