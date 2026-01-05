"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Check, X, Undo2 } from "lucide-react";
import { useAdjustMode } from "./adjust-mode-context";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface AdjustModeToggleProps {
  /** Callback when changes should be applied */
  onApplyChanges: () => void | Promise<void>;
  /** Whether changes are currently being applied */
  isApplying?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Toggle button for entering/exiting adjust mode
 *
 * When inactive: Shows a simple "Adjust" button
 * When active: Shows status badge, change count, and action buttons
 *
 * Keyboard shortcuts:
 * - Escape: Exit adjust mode (cancels pending changes)
 */
export function AdjustModeToggle({
  onApplyChanges,
  isApplying = false,
  className,
}: AdjustModeToggleProps) {
  const {
    isAdjustMode,
    toggleAdjustMode,
    pendingChanges,
    clearPendingChanges,
    undoLastChange,
    hasPendingChanges,
    pendingChangesCount,
  } = useAdjustMode();

  // Handle Escape key to exit adjust mode
  React.useEffect(() => {
    if (!isAdjustMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isApplying) {
        e.preventDefault();
        clearPendingChanges();
        toggleAdjustMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdjustMode, isApplying, clearPendingChanges, toggleAdjustMode]);

  // Inactive state - show simple toggle button
  if (!isAdjustMode) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAdjustMode}
              className={cn("gap-2", className)}
            >
              <Pencil className="h-4 w-4" />
              Adjust
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Enter adjust mode to manually reassign guides
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Active state - show status and actions
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Adjust Mode Badge - prominent visual indicator */}
      <Badge
        variant="secondary"
        className={cn(
          "bg-primary/10 text-primary border-primary/30",
          "dark:bg-primary/20 dark:text-primary dark:border-primary/40",
          "animate-pulse-subtle font-medium"
        )}
      >
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        Edit Mode
      </Badge>

      {/* Pending Changes Count */}
      {hasPendingChanges && (
        <Badge variant="outline" className="font-mono tabular-nums">
          {pendingChangesCount} change{pendingChangesCount !== 1 ? "s" : ""}
        </Badge>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Undo Button */}
        {hasPendingChanges && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={undoLastChange}
                  disabled={isApplying}
                  className="h-8 w-8 p-0"
                >
                  <Undo2 className="h-4 w-4" />
                  <span className="sr-only">Undo last change</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Undo last change
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Cancel Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearPendingChanges();
            toggleAdjustMode();
          }}
          disabled={isApplying}
          className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Cancel</span>
        </Button>

        {/* Apply Button */}
        <Button
          size="sm"
          onClick={onApplyChanges}
          disabled={!hasPendingChanges || isApplying}
          className={cn(
            "h-8 gap-1.5",
            hasPendingChanges &&
              !isApplying &&
              "bg-emerald-600 hover:bg-emerald-700 text-white"
          )}
        >
          {isApplying ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="hidden sm:inline">Applying...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span className="hidden sm:inline">Apply</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

AdjustModeToggle.displayName = "AdjustModeToggle";
