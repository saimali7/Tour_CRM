"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, Users, MapPin, Calendar } from "lucide-react";
import { SegmentWrapper } from "./segment";
import type { TourSegment as TourSegmentType } from "./types";
import { formatDuration, formatTimeDisplay, confidenceColors } from "./types";

// =============================================================================
// TYPES
// =============================================================================

interface TourSegmentProps {
  segment: TourSegmentType;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

// =============================================================================
// TOUR SEGMENT COMPONENT
// =============================================================================

export function TourSegment({
  segment,
  isSelected = false,
  onClick,
  className,
}: TourSegmentProps) {
  const { tour, totalGuests, confidence } = segment;
  const colors = confidenceColors[confidence];

  // Check if this is a pending (uncommitted) segment
  const isPending = segment.id.startsWith("pending_");

  const startTimeDisplay = formatTimeDisplay(segment.startTime);
  const endTimeDisplay = formatTimeDisplay(segment.endTime);
  const durationDisplay = formatDuration(segment.durationMinutes);

  const ariaLabel = tour.name + ": " + totalGuests + " " + (totalGuests === 1 ? "guest" : "guests") + ", " + startTimeDisplay + " to " + endTimeDisplay + " (" + durationDisplay + ")";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-full w-full">
            <SegmentWrapper
              type="tour"
              isSelected={isSelected}
              isInteractive={!!onClick}
              onClick={onClick}
              ariaLabel={ariaLabel}
              className={cn(
                colors.bg,
                colors.bgHover,
                colors.text,
                "opacity-100",
                "shadow-md",
                "bg-gradient-to-b from-white/10 to-transparent",
                // Pending segment styling - dashed border, subtle animation
                isPending && [
                  "border-2 border-dashed border-primary/50",
                  "animate-pulse",
                  "ring-1 ring-primary/20",
                ],
                className
              )}
            >
              <div className="flex h-full flex-col justify-center overflow-hidden px-2 py-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 flex-shrink-0 opacity-80" aria-hidden="true" />
                  <span className="truncate text-xs font-semibold leading-tight">
                    {tour.name}
                  </span>
                  {isPending && (
                    <span className="flex-shrink-0 rounded bg-white/30 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide">
                      Pending
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] opacity-80">
                  <span className="tabular-nums">
                    {startTimeDisplay} - {endTimeDisplay}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Users className="h-2.5 w-2.5" aria-hidden="true" />
                    <span className="tabular-nums">{totalGuests}</span>
                  </span>
                </div>
              </div>
            </SegmentWrapper>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-sm p-0">
          <TourTooltipContent segment={segment} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

TourSegment.displayName = "TourSegment";

// =============================================================================
// TOUR TOOLTIP CONTENT
// =============================================================================

interface TourTooltipContentProps {
  segment: TourSegmentType;
}

function TourTooltipContent({ segment }: TourTooltipContentProps) {
  const { tour, totalGuests, confidence } = segment;
  const colors = confidenceColors[confidence];

  const startTimeDisplay = formatTimeDisplay(segment.startTime);
  const endTimeDisplay = formatTimeDisplay(segment.endTime);
  const durationDisplay = formatDuration(segment.durationMinutes);

  return (
    <div className="divide-y divide-border">
      <div className={cn("px-3 py-2", colors.bg, colors.text)}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{tour.name}</span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
            {totalGuests} {totalGuests === 1 ? "guest" : "guests"}
          </span>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">
            {startTimeDisplay} - {endTimeDisplay}
          </span>
          <span className="text-muted-foreground">
            ({durationDisplay})
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span>
            {totalGuests} {totalGuests === 1 ? "guest" : "guests"} assigned
          </span>
        </div>
        {tour.meetingPoint && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">{tour.meetingPoint}</span>
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 text-center text-xs text-muted-foreground">
        Click for tour details
      </div>
    </div>
  );
}

TourTooltipContent.displayName = "TourTooltipContent";
