"use client";

import { cn } from "@/lib/utils";
import { useMemo, useRef, useEffect, useState } from "react";
import { type GuideData } from "./guide-row";
import { DroppableGuideRow } from "./droppable-guide-row";
import { TimelineHeader } from "./timeline-segment";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/button";

interface GuideTimelineProps {
  guides: GuideData[];
  selectedGuideId?: string | null;
  onSelectGuide: (guideId: string | null) => void;
  isLoading?: boolean;
  className?: string;
}

// Timeline configuration
const HOUR_WIDTH = 80; // pixels per hour
const START_HOUR = 6; // 6:00 AM
const END_HOUR = 20; // 8:00 PM

export function GuideTimeline({
  guides,
  selectedGuideId,
  onSelectGuide,
  isLoading,
  className,
}: GuideTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  // Calculate timeline width
  const timelineWidth = (END_HOUR - START_HOUR + 1) * HOUR_WIDTH;

  // Sort guides by current load (most available first)
  const sortedGuides = useMemo(() => {
    return [...guides].sort((a, b) => {
      // Guides with capacity come first
      const aHasCapacity = a.currentLoad < a.vehicleCapacity;
      const bHasCapacity = b.currentLoad < b.vehicleCapacity;
      if (aHasCapacity !== bHasCapacity) return aHasCapacity ? -1 : 1;
      // Then by remaining capacity
      return (b.vehicleCapacity - b.currentLoad) - (a.vehicleCapacity - a.currentLoad);
    });
  }, [guides]);

  // Stats
  const stats = useMemo(() => {
    const totalCapacity = guides.reduce((sum, g) => sum + g.vehicleCapacity, 0);
    const totalLoad = guides.reduce((sum, g) => sum + g.currentLoad, 0);
    const availableGuides = guides.filter((g) => g.currentLoad < g.vehicleCapacity).length;
    return { totalCapacity, totalLoad, availableGuides };
  }, [guides]);

  // Update scroll state
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollPosition(container.scrollLeft);
      setMaxScroll(container.scrollWidth - container.clientWidth);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [guides]);

  // Scroll handlers
  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -HOUR_WIDTH * 2, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: HOUR_WIDTH * 2, behavior: "smooth" });
  };

  if (isLoading) {
    return <GuideTimelineSkeleton className={className} />;
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Guide Timeline</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.availableGuides} available · {stats.totalLoad}/{stats.totalCapacity} capacity
            </p>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Scroll left"
              onClick={scrollLeft}
              disabled={scrollPosition <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Scroll right"
              onClick={scrollRight}
              disabled={scrollPosition >= maxScroll}
            >
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Fixed Guide Info Column */}
          <div className="flex-shrink-0 w-48 border-r border-border bg-background z-10">
            {/* Empty header space */}
            <div className="h-6 border-b border-border" />
            {/* Guide names will be in GuideRow */}
          </div>

          {/* Scrollable Timeline */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto scrollbar-thin"
          >
            <div style={{ width: `${timelineWidth}px`, minWidth: "100%" }}>
              {/* Time Header */}
              <TimelineHeader
                startHour={START_HOUR}
                endHour={END_HOUR}
                hourWidth={HOUR_WIDTH}
              />

              {/* Guide Rows */}
              <div className="divide-y divide-border">
                {sortedGuides.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No guides available</p>
                    </div>
                  </div>
                ) : (
                  sortedGuides.map((guide) => (
                    <DroppableGuideRow
                      key={guide.id}
                      guide={guide}
                      hourWidth={HOUR_WIDTH}
                      startHour={START_HOUR}
                      isSelected={selectedGuideId === guide.id}
                      onSelect={() =>
                        onSelectGuide(selectedGuideId === guide.id ? null : guide.id)
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Time Indicator */}
      <CurrentTimeIndicator
        startHour={START_HOUR}
        hourWidth={HOUR_WIDTH}
        containerRef={scrollContainerRef}
      />
    </div>
  );
}

// Current time line indicator
function CurrentTimeIndicator({
  startHour,
  hourWidth,
  containerRef,
}: {
  startHour: number;
  hourWidth: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = startHour * 60;
      const offset = currentMinutes - startMinutes;

      if (offset >= 0) {
        setPosition((offset / 60) * hourWidth + 192); // 192 = guide panel width
      } else {
        setPosition(null);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [startHour, hourWidth]);

  if (position === null) return null;

  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-20"
      style={{ left: `${position}px` }}
    >
      <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-500" />
    </div>
  );
}

function GuideTimelineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 w-28 skeleton rounded" />
            <div className="h-3 w-40 skeleton rounded" />
          </div>
          <div className="flex gap-1">
            <div className="h-8 w-8 skeleton rounded" />
            <div className="h-8 w-8 skeleton rounded" />
          </div>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-2">
            <div className="h-16 w-48 skeleton rounded" />
            <div className="h-16 flex-1 skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
