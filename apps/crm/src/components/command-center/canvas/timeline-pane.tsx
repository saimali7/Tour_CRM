"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTimeDisplay } from "../timeline/timeline-utils";
import type { CanvasRow, CanvasRun } from "../dispatch-model";
import type { DragPayload, DragPreview, LanePressureLevel, RunSignals } from "./canvas-types";
import { LaneRow } from "./lane-row";

interface Marker {
  time: string;
  label: string;
  left: number;
}

interface ZoomOption {
  label: string;
  value: number;
}

interface TimelinePaneProps {
  rows: CanvasRow[];
  markers: Marker[];
  timelineZoom: number;
  zoomOptions: readonly ZoomOption[];
  onZoomChange: (value: number) => void;
  showCurrentTime: boolean;
  currentTimeLabel: string;
  currentTimePercent: number;
  dragPayload: DragPayload | null;
  dragPreview: DragPreview | null;
  activeGuideDrop: string | null;
  projectedGuestsForRow: (row: CanvasRow) => number;
  pressureForRow: (row: CanvasRow) => LanePressureLevel;
  isEditing: boolean;
  isReadOnly: boolean;
  isMutating: boolean;
  selectedRunId: string | null;
  warningLinkedRunIds: Set<string>;
  runSignalsMap: Map<string, RunSignals>;
  onGuideClick: (guideId: string) => void;
  onLaneDragOver: (guideId: string, event: React.DragEvent<HTMLDivElement>) => void;
  onLaneDragLeave: (guideId: string, event: React.DragEvent<HTMLDivElement>) => void;
  onLaneDrop: (guideId: string, event: React.DragEvent<HTMLDivElement>) => void;
  onRunClick: (guideId: string, run: CanvasRun) => void;
  onRunDragStart: (guideId: string, run: CanvasRun) => void;
  onRunDragEnd: () => void;
  onRunNudge: (guideId: string, run: CanvasRun, deltaMinutes: number) => void;
  onBackgroundClick: () => void;
  onAddTempGuideClick: () => void;
}

const LANE_ROW_MIN_HEIGHT = 80;
const TEMP_GUIDE_ROW_HEIGHT = 56;
const TIMELINE_HEADER_HEIGHT = 36;

function shouldShowMarkerLabel(time: string): boolean {
  const hour = Number(time.split(":")[0]);
  if (Number.isNaN(hour)) return true;
  if (hour === 6) return true;
  return hour % 2 === 0;
}

function shouldHideMarkerForCurrentTime(markerLeft: number, currentTimePercent: number, showCurrentTime: boolean): boolean {
  if (!showCurrentTime) return false;
  return Math.abs(markerLeft - currentTimePercent) < 3;
}

function currentLabelPositionClass(currentTimePercent: number): string {
  if (currentTimePercent > 95) return "-translate-x-full -ml-1";
  return "translate-x-0 ml-1";
}

export function TimelinePane({
  rows,
  markers,
  timelineZoom,
  zoomOptions,
  onZoomChange,
  showCurrentTime,
  currentTimeLabel,
  currentTimePercent,
  dragPayload,
  dragPreview,
  activeGuideDrop,
  projectedGuestsForRow,
  pressureForRow,
  isEditing,
  isReadOnly,
  isMutating,
  selectedRunId,
  warningLinkedRunIds,
  runSignalsMap,
  onGuideClick,
  onLaneDragOver,
  onLaneDragLeave,
  onLaneDrop,
  onRunClick,
  onRunDragStart,
  onRunDragEnd,
  onRunNudge,
  onBackgroundClick,
  onAddTempGuideClick,
}: TimelinePaneProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [fillerRows, setFillerRows] = useState(0);

  const handleBackgroundClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("button, a, input, textarea, select, [role='button']")) return;
      onBackgroundClick();
    },
    [onBackgroundClick]
  );

  const timelineTrackStyle =
    timelineZoom > 1
      ? { width: `${Math.round(timelineZoom * 100)}%` }
      : undefined;

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const computeFillerRows = () => {
      const viewportHeight = node.clientHeight;
      const fixedHeight = TIMELINE_HEADER_HEIGHT + TEMP_GUIDE_ROW_HEIGHT;
      const usedHeight = fixedHeight + rows.length * LANE_ROW_MIN_HEIGHT;
      const remaining = Math.max(0, viewportHeight - usedHeight);
      const rowCount = Math.ceil(remaining / LANE_ROW_MIN_HEIGHT);
      setFillerRows(rowCount);
    };

    computeFillerRows();
    const observer = new ResizeObserver(computeFillerRows);
    observer.observe(node);

    return () => observer.disconnect();
  }, [rows.length, isReadOnly, isMutating]);

  return (
    <div
      ref={viewportRef}
      data-timeline-scroll="true"
      className="relative h-full min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain bg-background/35"
      onClick={handleBackgroundClick}
    >
      <div className="sticky top-0 z-10 border-b bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-9">
          <div className="sticky left-0 z-20 w-[180px] shrink-0 border-r bg-card/95 px-2.5 py-2 shadow-[8px_0_12px_-12px_hsl(var(--foreground)/0.55)] supports-[backdrop-filter]:bg-card/90 min-[1400px]:w-[188px] 2xl:w-[196px]">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Guides</span>
          </div>
          <div className={cn("relative px-1.5", timelineZoom > 1 ? "shrink-0" : "flex-1")} style={timelineTrackStyle}>
            {markers.map((marker) => (
              <div
                key={marker.time}
                className={cn(
                  "pointer-events-none absolute bottom-0 top-0 border-l",
                  shouldShowMarkerLabel(marker.time) ? "border-border/28" : "border-border/14"
                )}
                style={{ left: `${marker.left}%` }}
              >
                {shouldShowMarkerLabel(marker.time) &&
                  !shouldHideMarkerForCurrentTime(marker.left, currentTimePercent, showCurrentTime) && (
                  <span className="pointer-events-none relative z-10 ml-1.5 mt-0.5 inline-flex whitespace-nowrap rounded-md border border-border/45 bg-card/95 px-1 py-0.5 text-[9px] font-medium text-muted-foreground shadow-sm">
                    {marker.label}
                  </span>
                )}
              </div>
            ))}
            {showCurrentTime && (
              <div
                className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-destructive/70 shadow-[0_0_0_1px_hsl(var(--destructive)/0.22)]"
                style={{ left: `${currentTimePercent}%` }}
              >
                <span className="absolute left-0 top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-destructive shadow-[0_0_0_2px_hsl(var(--background))]" />
                <span
                  className={cn(
                    "absolute left-0 top-0.5 whitespace-nowrap rounded-md border border-destructive/45 bg-card px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive shadow-md",
                    currentLabelPositionClass(currentTimePercent)
                  )}
                >
                  {formatTimeDisplay(currentTimeLabel)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="m-8 rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          No active guides for this date. Add guides to start dispatching.
        </div>
      )}

      {rows.map((row) => {
        const projectedGuests = projectedGuestsForRow(row);
        const willExceedCapacity = dragPayload ? projectedGuests > row.vehicleCapacity : false;
        const isActiveDrop = activeGuideDrop === row.guide.id;
        const lanePreview = dragPreview?.guideId === row.guide.id ? dragPreview : null;

        return (
          <LaneRow
            key={row.guide.id}
            row={row}
            markers={markers}
            dragPayload={dragPayload}
            dragPreview={lanePreview}
            timelineZoom={timelineZoom}
            isActiveDrop={isActiveDrop}
            projectedGuests={projectedGuests}
            willExceedCapacity={willExceedCapacity}
            pressureLevel={pressureForRow(row)}
            isEditing={isEditing}
            isReadOnly={isReadOnly}
            isMutating={isMutating}
            selectedRunId={selectedRunId}
            warningLinkedRunIds={warningLinkedRunIds}
            runSignalsMap={runSignalsMap}
            onGuideClick={onGuideClick}
            onLaneDragOver={(event) => onLaneDragOver(row.guide.id, event)}
            onLaneDragLeave={(event) => onLaneDragLeave(row.guide.id, event)}
            onLaneDrop={(event) => onLaneDrop(row.guide.id, event)}
            onRunClick={(run) => onRunClick(row.guide.id, run)}
            onRunDragStart={(run) => onRunDragStart(row.guide.id, run)}
            onRunDragEnd={onRunDragEnd}
            onRunNudge={(run, delta) => onRunNudge(row.guide.id, run, delta)}
          />
        );
      })}

      <div className="flex border-b border-dashed">
        <div className="sticky left-0 z-10 w-[180px] shrink-0 border-r bg-card/92 px-2 py-2 shadow-[8px_0_12px_-12px_hsl(var(--foreground)/0.55)] min-[1400px]:w-[188px] 2xl:w-[196px]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full justify-center gap-1.5 border-dashed border-primary/35 bg-primary/[0.04] text-[11px] font-semibold shadow-sm transition-colors hover:border-primary/55 hover:bg-primary/[0.09]"
            onClick={onAddTempGuideClick}
            disabled={isReadOnly || isMutating}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Temp Guide
          </Button>
          <p className="mt-1 text-center text-[10px] text-muted-foreground">Day-only outsourced lane</p>
        </div>
        <div
          className={cn(
            "flex min-h-[56px] items-center px-3",
            timelineZoom > 1 ? "shrink-0" : "flex-1"
          )}
          style={timelineZoom > 1 ? { width: `${Math.round(timelineZoom * 100)}%` } : undefined}
        >
          <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-dashed border-border/60 bg-card/55 px-3 py-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/75" />
            <span className="truncate">Add a temp guide lane for today, then drag runs into it as needed.</span>
          </div>
        </div>
      </div>

      {Array.from({ length: fillerRows }).map((_, index) => (
        <div
          key={`filler-row-${index}`}
          className={cn(
            "flex min-h-[80px] border-b",
            index % 2 === 0 ? "bg-transparent" : "bg-muted/[0.12]"
          )}
        >
          <div
            className={cn(
              "sticky left-0 z-[5] w-[180px] shrink-0 border-r min-[1400px]:w-[188px] 2xl:w-[196px]",
              index % 2 === 0 ? "bg-card/78" : "bg-card/88"
            )}
          />
          <div
            className={cn(
              "relative overflow-hidden bg-background/[0.01]",
              timelineZoom > 1 ? "shrink-0" : "flex-1"
            )}
            style={timelineTrackStyle}
          >
            <div className="pointer-events-none absolute inset-0">
              {markers.map((marker) => (
                <div
                  key={`filler-${index}-${marker.time}`}
                  className={cn(
                    "absolute bottom-0 top-0 border-l",
                    shouldShowMarkerLabel(marker.time) ? "border-border/16" : "border-border/8"
                  )}
                  style={{ left: `${marker.left}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Floating zoom pill */}
      <div className="sticky bottom-3 z-20 flex justify-end pr-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border bg-card/90 p-0.5 shadow-lg opacity-40 hover:opacity-100 transition-opacity backdrop-blur">
          {zoomOptions.map((option) => (
            <Button
              key={option.label}
              type="button"
              variant={timelineZoom === option.value ? "secondary" : "ghost"}
              size="sm"
              className="h-6 rounded-full px-2 text-[10px]"
              onClick={() => onZoomChange(option.value)}
              disabled={isMutating}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
