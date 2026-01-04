"use client";

import { AlertTriangle, Users, Car } from "lucide-react";
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

interface CapacityOverrideDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when override is confirmed */
  onConfirm: () => void;
  /** Whether the assignment is in progress */
  isLoading?: boolean;
  /** Name of the guide being assigned to */
  guideName: string;
  /** Current guest count for this guide */
  currentGuests: number;
  /** Number of guests being added */
  addingGuests: number;
  /** Vehicle capacity limit */
  vehicleCapacity: number;
  /** Name of the customer being assigned */
  customerName?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Warning dialog shown when assigning a booking would exceed vehicle capacity
 *
 * Allows the operator to override the capacity limit with explicit confirmation.
 */
export function CapacityOverrideDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  guideName,
  currentGuests,
  addingGuests,
  vehicleCapacity,
  customerName,
}: CapacityOverrideDialogProps) {
  const newTotal = currentGuests + addingGuests;
  const overBy = newTotal - vehicleCapacity;
  const utilizationPercent = Math.round((newTotal / vehicleCapacity) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Capacity Exceeded
          </DialogTitle>
          <DialogDescription className="text-xs">
            This assignment will exceed the vehicle capacity.
          </DialogDescription>
        </DialogHeader>

        {/* Capacity breakdown */}
        <div className="space-y-3 py-2">
          {/* Guide info */}
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Assigning to</p>
            <p className="text-sm font-medium">{guideName}</p>
          </div>

          {/* Capacity visualization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Capacity</span>
              <span className={cn(
                "font-medium",
                utilizationPercent > 100 ? "text-amber-500" : "text-foreground"
              )}>
                {newTotal} / {vehicleCapacity} guests ({utilizationPercent}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  utilizationPercent > 100 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
              />
            </div>

            {/* Breakdown */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>Current: {currentGuests}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-amber-500">+{addingGuests} new</span>
              </div>
              <div className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                <span>Max: {vehicleCapacity}</span>
              </div>
            </div>
          </div>

          {/* Warning message */}
          <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {overBy} {overBy === 1 ? "guest" : "guests"} over capacity
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                {customerName
                  ? `Assigning ${customerName} will require a larger vehicle or splitting the group.`
                  : "This may require a larger vehicle or splitting the group."}
              </p>
            </div>
          </div>
        </div>

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
            variant="default"
            onClick={onConfirm}
            disabled={isLoading}
            className="h-8 gap-1.5 bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? "Assigning..." : "Assign Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

CapacityOverrideDialog.displayName = "CapacityOverrideDialog";
