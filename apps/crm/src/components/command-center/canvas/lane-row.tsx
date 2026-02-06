"use client";

import { Users, AlertTriangle, Gauge } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatTimeDisplay } from "../timeline/timeline-utils";
import type { CanvasRow, CanvasRun } from "../dispatch-model";
import type { DragPayload, DragPreview, LanePressureLevel } from "./canvas-types";
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
  onGuideClick: (guideId: string) => void;
  onLaneDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onLaneDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onLaneDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onRunClick: (run: CanvasRun) => void;
  onRunDragStart: (run: CanvasRun) => void;
  onRunDragEnd: () => void;
  onRunNudge: (run: CanvasRun, deltaMinutes: number) => void;
}

const pressureChipClass: Record<LanePressureLevel, string> = {
  low: "bg-success/15 text-success border-success/25",
  medium: "bg-info/15 text-info border-info/25",
  high: "bg-warning/15 text-warning border-warning/25",
  critical: "bg-destructive/15 text-destructive border-destructive/25",
};

function pressureLabel(level: LanePressureLevel): string {
  if (level === "critical") return "critical";
  if (level === "high") return "high";
  if (level === "medium") return "medium";
  return "low";
}

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
  onGuideClick,
  onLaneDragOver,
  onLaneDragLeave,
  onLaneDrop,
  onRunClick,
  onRunDragStart,
  onRunDragEnd,
  onRunNudge,
}: LaneRowProps) {
  const guideFullName = `${row.guide.firstName} ${row.guide.lastName}`.trim();
  const guideDisplayName = guideFullName || row.guide.firstName;
  const previewLeft = dragPreview?.leftPercent ?? 0;
  const previewWidth = dragPreview
    ? Math.max(2, Math.min(dragPreview.widthPercent, Math.max(2, 99.65 - previewLeft)))
    : 0;
  const previewTouchesBoundary = Boolean(
    dragPreview && (dragPreview.startTime === "06:00" || dragPreview.endTime === "24:00")
  );

  return (
    <div key={row.guide.id} className="flex min-h-[112px] border-b">
      <button
        type="button"
        className="sticky left-0 z-10 flex w-[228px] shrink-0 items-start gap-2.5 border-r bg-card/90 px-3 py-2.5 text-left shadow-[8px_0_12px_-12px_hsl(var(--foreground)/0.55)] transition-colors hover:bg-muted/30 min-[1400px]:w-[240px] 2xl:w-[252px]"
        onClick={() => onGuideClick(row.guide.id)}
      >
        <UserAvatar
          name={guideFullName}
          src={row.guide.avatarUrl ?? undefined}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p
              className="line-clamp-2 min-w-0 flex-1 text-[13.5px] font-semibold leading-tight text-foreground"
              title={guideFullName}
            >
              {guideDisplayName}
            </p>
            <span
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                pressureChipClass[pressureLevel]
              )}
            >
              {pressureLabel(pressureLevel)}
            </span>
          </div>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Users className="h-3 w-3" />
              {row.totalGuests}/{row.vehicleCapacity}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Gauge className="h-3 w-3" />
              {row.utilization}%
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="tabular-nums">
              {row.runs.length} run{row.runs.length === 1 ? "" : "s"}
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
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No assignments
          </div>
        )}

        {row.runs.map((run) => (
          <RunBlock
            key={run.id}
            run={run}
            isEditing={isEditing}
            isReadOnly={isReadOnly}
            isMutating={isMutating}
            isSelected={selectedRunId === run.id}
            isDragging={dragPayload?.source === "guide" && dragPayload.runId === run.id}
            isWarningFocus={warningLinkedRunIds.has(run.id)}
            onClick={() => onRunClick(run)}
            onDragStart={() => onRunDragStart(run)}
            onDragEnd={onRunDragEnd}
            onNudge={(delta) => onRunNudge(run, delta)}
          />
        ))}

        {dragPreview && dragPayload?.source === "guide" && (
          <div
            data-drag-preview="true"
            className="pointer-events-none absolute bottom-2.5 top-2.5 z-20 overflow-hidden rounded-lg border border-primary/70 bg-primary/20 shadow-sm"
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
              "pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium",
              willExceedCapacity
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            )}
          >
            {willExceedCapacity && <AlertTriangle className="h-3 w-3" />}
            <span className="tabular-nums">
              {projectedGuests}/{row.vehicleCapacity} seats
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
