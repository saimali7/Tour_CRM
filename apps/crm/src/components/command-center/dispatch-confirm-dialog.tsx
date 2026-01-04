"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  Users,
  UserCheck,
  Gauge,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface DispatchConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when dispatch is confirmed */
  onConfirm: () => void;
  /** Whether the dispatch is in progress */
  isLoading?: boolean;
  /** The date being dispatched */
  date: Date;
  /** Number of guides being notified */
  guideCount: number;
  /** Total guests for the day */
  totalGuests: number;
  /** Efficiency score 0-100 */
  efficiencyScore: number;
  /** Number of unresolved warnings */
  warningsCount?: number;
}

// =============================================================================
// HELPER
// =============================================================================

function getEfficiencyColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function getEfficiencyLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return "Needs attention";
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Confirmation dialog shown before dispatching guides
 *
 * Displays a summary of what will be dispatched and requires
 * explicit confirmation before sending notifications.
 */
export function DispatchConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  date,
  guideCount,
  totalGuests,
  efficiencyScore,
  warningsCount = 0,
}: DispatchConfirmDialogProps) {
  const hasWarnings = warningsCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-emerald-500" />
            Confirm Dispatch
          </DialogTitle>
          <DialogDescription className="text-xs">
            This will send notifications to all assigned guides.
          </DialogDescription>
        </DialogHeader>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 py-2">
          {/* Date */}
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="truncate text-sm font-medium">
                {format(date, "MMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Guides */}
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Guides</p>
              <p className="text-sm font-medium">
                {guideCount} {guideCount === 1 ? "guide" : "guides"}
              </p>
            </div>
          </div>

          {/* Guests */}
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Guests</p>
              <p className="text-sm font-medium">
                {totalGuests} {totalGuests === 1 ? "guest" : "guests"}
              </p>
            </div>
          </div>

          {/* Efficiency */}
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <Gauge className={cn("h-4 w-4", getEfficiencyColor(efficiencyScore))} />
            <div>
              <p className="text-xs text-muted-foreground">Efficiency</p>
              <p className={cn("text-sm font-medium", getEfficiencyColor(efficiencyScore))}>
                {efficiencyScore}%
              </p>
            </div>
          </div>
        </div>

        {/* Warning banner */}
        {hasWarnings && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {warningsCount} unresolved {warningsCount === 1 ? "issue" : "issues"}
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                Consider resolving issues before dispatching.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-8"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send Dispatch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

DispatchConfirmDialog.displayName = "DispatchConfirmDialog";
