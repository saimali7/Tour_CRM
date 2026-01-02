"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DispatchStatus } from "./command-center";

interface DispatchHeaderProps {
  formattedDate: string;
  previousDayLabel: string;
  nextDayLabel: string;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  status: DispatchStatus;
  isToday: boolean;
}

export function DispatchHeader({
  formattedDate,
  previousDayLabel,
  nextDayLabel,
  onPreviousDay,
  onNextDay,
  onToday,
  status,
  isToday,
}: DispatchHeaderProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {/* Previous Day Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onPreviousDay}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-sm">{previousDayLabel}</span>
      </Button>

      {/* Current Date */}
      <div className="flex items-center gap-3 px-4">
        <button
          onClick={onToday}
          disabled={isToday}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            isToday
              ? "bg-primary/10 text-primary cursor-default"
              : "bg-muted hover:bg-muted/80 text-foreground"
          )}
        >
          <Calendar className="h-4 w-4" />
          <span className="text-base font-semibold tracking-tight uppercase">
            {formattedDate}
          </span>
        </button>
      </div>

      {/* Next Day Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onNextDay}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <span className="text-sm">{nextDayLabel}</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
