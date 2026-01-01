"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Wand2, CheckCircle2, Bell, Printer, Loader2 } from "lucide-react";

interface BulkActionsBarProps {
  // Counts for enabling/disabling buttons
  toursNeedingAssignment: number;
  readyToApprove: number;
  readyToNotify: number;

  // Loading states
  isAutoAssigning?: boolean;
  isApproving?: boolean;
  isNotifying?: boolean;

  // Handlers
  onAutoAssignAll: () => void;
  onApproveAll: () => void;
  onNotifyAll: () => void;
  onPrintManifests: () => void;

  className?: string;
}

export function BulkActionsBar({
  toursNeedingAssignment,
  readyToApprove,
  readyToNotify,
  isAutoAssigning,
  isApproving,
  isNotifying,
  onAutoAssignAll,
  onApproveAll,
  onNotifyAll,
  onPrintManifests,
  className,
}: BulkActionsBarProps) {
  const isAnyLoading = isAutoAssigning || isApproving || isNotifying;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "border-t border-border bg-background/95 backdrop-blur-sm",
        "px-4 py-3 sm:px-6",
        // Account for sidebar on desktop
        "lg:left-[60px]",
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left side - Primary action */}
        <div className="flex items-center gap-3">
          {toursNeedingAssignment > 0 && (
            <Button
              onClick={onAutoAssignAll}
              disabled={isAnyLoading}
              className={cn(
                "relative",
                "bg-gradient-to-r from-primary to-primary/80",
                "hover:from-primary/90 hover:to-primary/70",
                "shadow-lg shadow-primary/20"
              )}
            >
              {isAutoAssigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Auto-Assign All</span>
              <span className="sm:hidden">Assign</span>
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-white/20">
                {toursNeedingAssignment}
              </span>
            </Button>
          )}
        </div>

        {/* Right side - Secondary actions */}
        <div className="flex items-center gap-2">
          {/* Approve All */}
          <Button
            variant="outline"
            size="sm"
            onClick={onApproveAll}
            disabled={readyToApprove === 0 || isAnyLoading}
            className={cn(
              readyToApprove > 0 &&
                "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            )}
          >
            {isApproving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Approve</span>
            {readyToApprove > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10">
                {readyToApprove}
              </span>
            )}
          </Button>

          {/* Notify All */}
          <Button
            variant="outline"
            size="sm"
            onClick={onNotifyAll}
            disabled={readyToNotify === 0 || isAnyLoading}
            className={cn(
              readyToNotify > 0 &&
                "border-violet-500/30 text-violet-700 dark:text-violet-400 hover:bg-violet-500/10"
            )}
          >
            {isNotifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Notify</span>
            {readyToNotify > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-violet-500/10">
                {readyToNotify}
              </span>
            )}
          </Button>

          {/* Print Manifests */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrintManifests}
            disabled={isAnyLoading}
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Print</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Floating action button for mobile
export function AutoAssignFAB({
  count,
  onClick,
  isLoading,
}: {
  count: number;
  onClick: () => void;
  isLoading?: boolean;
}) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "fixed bottom-20 right-4 z-50",
        "flex items-center gap-2 px-4 py-3 rounded-full",
        "bg-primary text-primary-foreground",
        "shadow-lg shadow-primary/30",
        "hover:scale-105 active:scale-95 transition-transform",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "lg:hidden" // Only show on mobile
      )}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Wand2 className="h-5 w-5" />
      )}
      <span className="font-semibold">Auto-Assign</span>
      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white/20">
        {count}
      </span>
    </button>
  );
}
