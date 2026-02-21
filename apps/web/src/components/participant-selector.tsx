"use client";

import { Minus, Plus } from "lucide-react";

interface ParticipantSelectorProps {
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  price?: string;
  onChange: (value: number) => void;
}

export function ParticipantSelector({
  label,
  description,
  value,
  min = 0,
  max = 20,
  price,
  onChange,
}: ParticipantSelectorProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {price && (
            <span className="text-sm text-muted-foreground">{price}</span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-all hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-foreground"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <span className="w-8 text-center text-sm font-semibold tabular-nums">
          {value}
        </span>

        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-all hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-foreground"
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
