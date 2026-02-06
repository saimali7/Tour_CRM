"use client";

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
}

function shouldShowMarkerLabel(time: string): boolean {
  const hour = Number(time.split(":")[0]);
  if (Number.isNaN(hour)) return true;
  if (hour === 6 || hour === 24) return true;
  return hour % 2 === 0;
}

function shouldHideMarkerForCurrentTime(markerLeft: number, currentTimePercent: number, showCurrentTime: boolean): boolean {
  if (!showCurrentTime) return false;
  return Math.abs(markerLeft - currentTimePercent) < 3;
}

function currentLabelPositionClass(currentTimePercent: number): string {
  if (currentTimePercent < 6) return "translate-x-0 ml-1";
  if (currentTimePercent > 94) return "-translate-x-full -ml-1";
  return "-translate-x-1/2";
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
}: TimelinePaneProps) {
  const timelineTrackStyle =
    timelineZoom > 1
      ? { width: `${Math.round(timelineZoom * 100)}%` }
      : undefined;

  return (
    <div data-timeline-scroll="true" className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-background/20">
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
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
                  shouldShowMarkerLabel(marker.time) ? "border-border/45" : "border-border/20"
                )}
                style={{ left: `${marker.left}%` }}
              >
                {shouldShowMarkerLabel(marker.time) &&
                  !shouldHideMarkerForCurrentTime(marker.left, currentTimePercent, showCurrentTime) && (
                  <span className="pointer-events-none relative z-10 ml-1.5 mt-0.5 inline-flex whitespace-nowrap rounded-sm bg-card/95 px-1 py-0.5 text-[9px] font-medium text-muted-foreground shadow-sm">
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
                <span className="absolute top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive shadow-[0_0_0_2px_hsl(var(--background))]" />
                <span
                  className={cn(
                    "absolute -top-3 rounded-md border border-destructive/45 bg-card px-1.5 py-0.5 text-[10px] font-semibold text-destructive shadow-md",
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
          No available guides for this date. Add guide availability to start dispatching.
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
