"use client";

import { cn } from "@/lib/utils";

interface CapacityBarProps {
  current: number;
  max: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function CapacityBar({
  current,
  max,
  size = "md",
  showLabel = true,
  className,
}: CapacityBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isOverCapacity = current > max;
  const isFull = percentage >= 100;
  const isHigh = percentage >= 75;
  const isLow = percentage < 25;

  // Color based on utilization
  const fillColor = isOverCapacity
    ? "bg-red-500"
    : isFull
      ? "bg-amber-500"
      : isHigh
        ? "bg-emerald-500"
        : isLow
          ? "bg-blue-400"
          : "bg-blue-500";

  const heightClass = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2",
  }[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex-1 rounded-full bg-muted/60 overflow-hidden",
          heightClass
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            fillColor
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={cn(
            "text-xs font-mono tabular-nums flex-shrink-0",
            isOverCapacity
              ? "text-red-600 dark:text-red-400 font-semibold"
              : "text-muted-foreground"
          )}
        >
          {current}/{max}
        </span>
      )}
    </div>
  );
}

// Compact version for tight spaces
interface CapacityPillProps {
  current: number;
  max: number;
  className?: string;
}

export function CapacityPill({ current, max, className }: CapacityPillProps) {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const isOverCapacity = current > max;
  const isFull = percentage >= 100;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono tabular-nums",
        isOverCapacity && "bg-red-500/10 text-red-600 dark:text-red-400",
        isFull && !isOverCapacity && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        !isFull && !isOverCapacity && "bg-muted text-muted-foreground",
        className
      )}
    >
      <span className="font-semibold">{current}</span>
      <span className="opacity-50">/</span>
      <span>{max}</span>
    </span>
  );
}
