"use client";

import { cn } from "@/lib/utils";
import { Users, Car, Star } from "lucide-react";
import { CapacityBar } from "./capacity-bar";
import { TimelineSegment, type TimelineSegmentData } from "./timeline-segment";
import { forwardRef } from "react";

export interface GuideData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  vehicleCapacity: number;
  vehicleType?: string | null;
  preferredZones?: string[];
  currentLoad: number; // Current passengers assigned
  segments: TimelineSegmentData[];
}

interface GuideRowProps {
  guide: GuideData;
  hourWidth: number;
  startHour: number;
  isDropTarget?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export const GuideRow = forwardRef<HTMLDivElement, GuideRowProps>(
  function GuideRow(
    { guide, hourWidth, startHour, isDropTarget, isSelected, onSelect, className },
    ref
  ) {
    const utilizationPercent = (guide.currentLoad / guide.vehicleCapacity) * 100;
    const isOverCapacity = guide.currentLoad > guide.vehicleCapacity;
    const hasCapacity = guide.currentLoad < guide.vehicleCapacity;

    return (
      <div
        ref={ref}
        onClick={onSelect}
        className={cn(
          "group flex border-b border-border transition-colors",
          isDropTarget && "bg-primary/5 border-primary/30",
          isSelected && "bg-accent",
          !isDropTarget && !isSelected && "hover:bg-muted/30",
          className
        )}
      >
        {/* Guide Info Panel (fixed width) */}
        <div
          className={cn(
            "flex-shrink-0 w-48 p-3 border-r border-border",
            "flex flex-col justify-center gap-2"
          )}
        >
          {/* Name + Vehicle */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold",
                hasCapacity
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : isOverCapacity
                    ? "bg-red-500/10 text-red-700 dark:text-red-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              )}
            >
              {guide.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{guide.name}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Car className="h-3 w-3" />
                <span>{guide.vehicleType || "Vehicle"}</span>
                <span>·</span>
                <Users className="h-3 w-3" />
                <span className="font-medium tabular-nums">{guide.vehicleCapacity}</span>
              </div>
            </div>
          </div>

          {/* Capacity Bar */}
          <CapacityBar
            current={guide.currentLoad}
            max={guide.vehicleCapacity}
            size="sm"
            showLabel={false}
          />

          {/* Preferred Zones */}
          {guide.preferredZones && guide.preferredZones.length > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-2.5 w-2.5 text-amber-500" />
              <span className="text-[9px] text-muted-foreground truncate">
                {guide.preferredZones.join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Timeline Panel (scrollable) */}
        <div className="flex-1 relative h-16 overflow-hidden">
          {/* Segments */}
          {guide.segments.map((segment) => (
            <TimelineSegment
              key={segment.id}
              segment={segment}
              hourWidth={hourWidth}
              startHour={startHour}
            />
          ))}

          {/* Drop zone indicator */}
          {isDropTarget && (
            <div className="absolute inset-0 border-2 border-dashed border-primary rounded-md pointer-events-none animate-pulse" />
          )}
        </div>
      </div>
    );
  }
);

// Compact version for mobile
export function GuideRowCompact({
  guide,
  isSelected,
  onSelect,
  className,
}: {
  guide: GuideData;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  const hasCapacity = guide.currentLoad < guide.vehicleCapacity;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:bg-muted/50",
        className
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
          hasCapacity
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        )}
      >
        {guide.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{guide.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {guide.currentLoad}/{guide.vehicleCapacity}
          </span>
          {guide.segments.length > 0 && (
            <span>{guide.segments.filter((s) => s.type === "pickup").length} pickups</span>
          )}
        </div>
      </div>

      <CapacityBar
        current={guide.currentLoad}
        max={guide.vehicleCapacity}
        size="sm"
        showLabel={false}
        className="w-16"
      />
    </button>
  );
}
