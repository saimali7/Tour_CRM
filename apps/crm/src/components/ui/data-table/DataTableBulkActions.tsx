"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, Loader2 } from "lucide-react";
import type { BulkActionBarProps } from "./types";

export function DataTableBulkActions({
  selectedCount,
  totalCount,
  onClearSelection,
  actions,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-4 py-3 rounded-xl",
        "bg-foreground text-background shadow-lg",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3 border-r border-background/20">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <button
          onClick={onClearSelection}
          className="p-1 rounded-md hover:bg-background/10 transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.loading || action.disabled}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
              "transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              action.variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-background/10 hover:bg-background/20 text-background"
            )}
          >
            {action.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              action.icon
            )}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Alias for backwards compatibility
export { DataTableBulkActions as BulkActionBar };
