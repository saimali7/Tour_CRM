"use client";

import { useRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { CanvasRun } from "../dispatch-model";
import { durationToPercent, timeToPercent } from "../timeline/timeline-utils";

interface RunBlockProps {
  run: CanvasRun;
  isEditing: boolean;
  isReadOnly: boolean;
  isMutating: boolean;
  isSelected: boolean;
  isDragging: boolean;
  isWarningFocus: boolean;
  onClick: () => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onNudge: (deltaMinutes: number) => void;
}

const confidenceClass: Record<CanvasRun["confidence"], string> = {
  optimal: "border-success/60 bg-success/15 text-success",
  good: "border-info/60 bg-info/15 text-info",
  review: "border-warning/70 bg-warning/15 text-warning",
  problem: "border-destructive/70 bg-destructive/15 text-destructive",
};

export function RunBlock({
  run,
  isEditing,
  isReadOnly,
  isMutating,
  isSelected,
  isDragging,
  isWarningFocus,
  onClick,
  onDragStart,
  onDragEnd,
  onNudge,
}: RunBlockProps) {
  const canDrag = isEditing && !isReadOnly && !isMutating;
  const draggedRef = useRef(false);
  const leftPercent = timeToPercent(run.startTime);
  const rawWidthPercent = Math.max(durationToPercent(run.durationMinutes), 2);
  const widthPercent = Math.max(1.8, Math.min(rawWidthPercent, Math.max(1.8, 99.65 - leftPercent)));
  const isCompact = widthPercent < 12;
  const isUltraCompact = widthPercent < 8;

  const dragProps: Partial<ButtonHTMLAttributes<HTMLButtonElement>> = canDrag
    ? {
        draggable: true,
        onDragStart: (event) => {
          draggedRef.current = true;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", run.id);
          onDragStart(event);
        },
        onDragEnd: () => {
          onDragEnd();
          window.setTimeout(() => {
            draggedRef.current = false;
          }, 0);
        },
      }
    : {};

  return (
    <button
      type="button"
      className={cn(
        "absolute bottom-2 top-2 overflow-hidden rounded-lg border px-2.5 py-2 text-left shadow-sm",
        "transition-[box-shadow,transform,border-color] duration-150 motion-reduce:transition-none",
        confidenceClass[run.confidence],
        canDrag && "cursor-grab active:cursor-grabbing hover:shadow-md",
        isDragging && "opacity-45",
        isSelected && "ring-2 ring-primary/60",
        isWarningFocus && "border-warning shadow-[0_0_0_1px_hsl(var(--warning)/0.35)]"
      )}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
      }}
      onClick={() => {
        if (draggedRef.current) return;
        onClick();
      }}
      onKeyDown={(event) => {
        if (!canDrag) return;
        if (!event.altKey) return;
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

        event.preventDefault();
        event.stopPropagation();

        const delta = event.key === "ArrowLeft" ? -15 : 15;
        onNudge(delta);
      }}
      aria-label={`${run.tourName} from ${run.displayStartLabel} to ${run.displayEndLabel}. Drag to reschedule. Alt plus left or right arrow nudges by 15 minutes.`}
      {...dragProps}
    >
      <div className="flex h-full min-w-0 flex-col justify-between gap-1">
        <div className="truncate text-[12.5px] font-semibold leading-snug text-foreground">{run.tourName}</div>
        <div className="min-w-0 space-y-0.5">
          <div className="truncate tabular-nums text-[10.5px] leading-tight text-foreground">
            {isUltraCompact ? run.displayStartLabel : `${run.displayStartLabel} - ${run.displayEndLabel}`}
          </div>
          {!isUltraCompact && (
            <div className="flex items-center gap-1.5 text-[10px] leading-tight text-muted-foreground">
              <span className="shrink-0 tabular-nums">{run.guestCount} guests</span>
              {!isCompact && (
                <>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="truncate">{run.bookingIds.length} bookings</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
