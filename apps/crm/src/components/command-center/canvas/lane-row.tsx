"use client";

import { Users, AlertTriangle } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatTimeDisplay } from "../timeline/timeline-utils";
import type { CanvasRow, CanvasRun } from "../dispatch-model";
import type { DragPayload, DragPreview, LanePressureLevel, RunSignals } from "./canvas-types";
import { RunBlock } from "./run-block";

interface Marker {
  time: string;
  left: number;
}

interface LaneRowProps {
  row: CanvasRow;
  markers: Marker[];
  timelineZoom: number;
  dragPayload: DragPayload | null;
  dragPreview: DragPreview | null;
  isActiveDrop: boolean;
  projectedGuests: number;
  willExceedCapacity: boolean;
  pressureLevel: LanePressureLevel;
  isEditing: boolean;
  isReadOnly: boolean;
  isMutating: boolean;
  selectedRunId: string | null;
  warningLinkedRunIds: Set<string>;
  runSignalsMap: Map<string, RunSignals>;
  onGuideClick: (guideId: string) => void;
  onLaneDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onLaneDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onLaneDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onRunClick: (run: CanvasRun) => void;
  onRunDragStart: (run: CanvasRun) => void;
  onRunDragEnd: () => void;
  onRunNudge: (run: CanvasRun, deltaMinutes: number) => void;
}

const capacityColor: Record<LanePressureLevel, string> = {
  low: "bg-success/15 text-success",
  medium: "bg-info/15 text-info",
  high: "bg-warning/15 text-warning",
  critical: "bg-destructive/15 text-destructive",
};

export function LaneRow({
  row,
  markers,
  timelineZoom,
  dragPayload,
  dragPreview,
  isActiveDrop,
  projectedGuests,
  willExceedCapacity,
  pressureLevel,
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
}: LaneRowProps) {
  const guideFirstName = row.guide.firstName;
  const guideFullName = `${row.guide.firstName} ${row.guide.lastName}`.trim();
  const previewLeft = dragPreview?.leftPercent ?? 0;
  const previewWidth = dragPreview
    ? Math.max(2, Math.min(dragPreview.widthPercent, Math.max(2, 99.65 - previewLeft)))
    : 0;
  const previewTouchesBoundary = Boolean(
    dragPreview && (dragPreview.startTime === "06:00" || dragPreview.endTime === "24:00")
  );

  return (
    <div key={row.guide.id} className="group/lane flex min-h-[80px] border-b">
      <button
        type="button"
        className="sticky left-0 z-10 flex w-[180px] shrink-0 items-center gap-2 border-r bg-card/90 px-2 py-2 text-left shadow-[8px_0_12px_-12px_hsl(var(--foreground)/0.55)] transition-colors hover:bg-muted/30 min-[1400px]:w-[188px] 2xl:w-[196px]"
        onClick={() => onGuideClick(row.guide.id)}
        title={`${guideFullName}${row.isOutsourced ? " (Outsourced)" : ""}\n${row.utilization}% utilization \u00B7 ${row.runs.length} runs`}
      >
        <UserAvatar
          name={guideFullName}
          src={row.guide.avatarUrl ?? undefined}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-tight text-foreground">
            {guideFirstName}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {row.isOutsourced && (
              <span className="inline-flex items-center rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold text-warning">
                OUT
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums",
                capacityColor[pressureLevel]
              )}
            >
              <Users className="h-2.5 w-2.5" />
              {row.totalGuests}/{row.vehicleCapacity}
            </span>
          </div>
        </div>
      </button>

      <div
        className={cn(
          "relative overflow-hidden",
          timelineZoom > 1 ? "shrink-0" : "flex-1",
          "bg-[linear-gradient(90deg,hsl(var(--muted)/0.14)_0%,transparent_12%,transparent_88%,hsl(var(--muted)/0.14)_100%)]",
          isActiveDrop && !willExceedCapacity && "bg-primary/5",
          isActiveDrop && willExceedCapacity && "bg-destructive/5"
        )}
        style={timelineZoom > 1 ? { width: `${Math.round(timelineZoom * 100)}%` } : undefined}
        onDragOver={onLaneDragOver}
        onDragLeave={onLaneDragLeave}
        onDrop={onLaneDrop}
      >
        <div className="pointer-events-none absolute inset-0">
          {markers.map((marker) => (
            <div
              key={`${row.guide.id}_${marker.time}`}
              className="absolute top-0 bottom-0 border-l border-border/30"
              style={{ left: `${marker.left}%` }}
            />
          ))}
        </div>

        {row.runs.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/60">
            No assignments
          </div>
        )}

        {row.runs.map((run) => (
          <RunBlock
            key={run.id}
            run={run}
            isEditing={isEditing}
            isReadOnly={isReadOnly || row.isOutsourced}
            isMutating={isMutating}
            isSelected={selectedRunId === run.id}
            isDragging={dragPayload?.source === "guide" && dragPayload.runId === run.id}
            isWarningFocus={warningLinkedRunIds.has(run.id)}
            signals={runSignalsMap.get(run.id)}
            onClick={() => onRunClick(run)}
            onDragStart={() => onRunDragStart(run)}
            onDragEnd={onRunDragEnd}
            onNudge={(delta) => onRunNudge(run, delta)}
          />
        ))}

        {dragPreview && dragPayload?.source === "guide" && (
          <div
            data-drag-preview="true"
            className="pointer-events-none absolute bottom-2 top-2 z-20 overflow-hidden rounded-lg border border-primary/70 bg-primary/20 shadow-sm"
            style={{
              left: `${previewLeft}%`,
              width: `${previewWidth}%`,
            }}
          >
            <div className="flex h-full flex-col justify-between px-2 py-1.5 text-[10px] font-medium text-primary-foreground">
              <div className="flex items-center justify-between gap-1">
                <div className="truncate rounded bg-primary/90 px-1.5 py-0.5 text-[10px]">
                  {dragPayload.tourName ?? "Run Preview"}
                </div>
                <span className="shrink-0 rounded bg-primary/90 px-1 py-0.5 text-[9px]">15m</span>
              </div>
              <div className="flex items-center justify-between rounded bg-primary/80 px-1.5 py-0.5">
                <span>{formatTimeDisplay(dragPreview.startTime)}</span>
                <span>{formatTimeDisplay(dragPreview.endTime)}</span>
              </div>
              {previewTouchesBoundary && (
                <div className="truncate rounded bg-primary/90 px-1.5 py-0.5 text-[9px]">Clamped to day bounds</div>
              )}
            </div>
          </div>
        )}

        {isActiveDrop && dragPayload && (
          <div
            className={cn(
              "pointer-events-none absolute right-3 top-2 z-20 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium",
              willExceedCapacity
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            )}
          >
            {willExceedCapacity && <AlertTriangle className="h-3 w-3" />}
            <span className="tabular-nums">
              {projectedGuests}/{row.vehicleCapacity}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
