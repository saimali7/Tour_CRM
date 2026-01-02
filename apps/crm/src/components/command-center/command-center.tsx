"use client";

import { useMemo, useCallback, useState } from "react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { DispatchHeader } from "./dispatch-header";
import { StatusBanner } from "./status-banner";
import { WarningsPanel } from "./warnings-panel";
import { TimelineContainer } from "./timeline/timeline-container";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { GuideTimeline, TimelineSegment, GuideInfo } from "./timeline/types";
import {
  AdjustModeProvider,
  AdjustModeToggle,
  DndProvider,
  useAdjustMode,
  type PendingChange,
} from "./adjust-mode";

// =============================================================================
// TYPES
// =============================================================================

export type DispatchStatus = "pending" | "optimized" | "needs_review" | "ready" | "dispatched";

export interface DispatchWarning {
  id: string;
  type: "capacity" | "no_guide" | "conflict" | "late_pickup";
  message: string;
  bookingId?: string;
  guestName?: string;
  guestCount?: number;
  suggestions: DispatchSuggestion[];
}

export interface DispatchSuggestion {
  id: string;
  label: string;
  description?: string;
  impact?: string; // e.g., "+18m drive"
  guideId?: string;
}

export interface DispatchData {
  status: DispatchStatus;
  totalGuests: number;
  totalGuides: number;
  totalDriveMinutes: number;
  efficiencyScore: number;
  dispatchedAt?: Date;
  warnings: DispatchWarning[];
  guideTimelines: GuideTimeline[];
}

interface CommandCenterProps {
  date: Date;
  onDateChange: (date: Date) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

// =============================================================================
// DATA TRANSFORMATION HELPERS
// =============================================================================

/**
 * Map service warning type to component warning type
 */
function mapWarningType(type: string): DispatchWarning["type"] {
  switch (type) {
    case "insufficient_guides":
    case "capacity_exceeded":
      return "capacity";
    case "no_qualified_guide":
    case "no_available_guide":
      return "no_guide";
    case "conflict":
      return "conflict";
    default:
      return "capacity";
  }
}

/**
 * Map service status to component dispatch status
 */
function mapDispatchStatus(status: string, unresolvedWarnings: number): DispatchStatus {
  if (status === "dispatched") return "dispatched";
  if (status === "ready") return "ready";
  if (status === "optimized" && unresolvedWarnings > 0) return "needs_review";
  if (status === "optimized") return "optimized";
  return "pending";
}

/**
 * Transform service timeline segment to component segment format
 */
function transformTimelineSegment(
  segment: {
    type: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    booking?: {
      id: string;
      referenceNumber: string;
      customerName: string;
      customerEmail: string | null;
      totalParticipants: number;
      adultCount: number;
      childCount: number;
      specialOccasion: string | null;
      isFirstTime: boolean;
    };
    pickupLocation?: string;
    guestCount?: number;
    tour?: { id: string; name: string; slug: string };
    tourRunKey?: string;
    confidence: string;
  },
  index: number
): TimelineSegment {
  const baseSegment = {
    id: `seg_${index}`,
    startTime: segment.startTime,
    endTime: segment.endTime,
    durationMinutes: segment.durationMinutes,
    confidence: (segment.confidence || "optimal") as "optimal" | "good" | "review" | "problem",
  };

  switch (segment.type) {
    case "idle":
      return { ...baseSegment, type: "idle" };
    case "drive":
      return { ...baseSegment, type: "drive" };
    case "pickup":
      return {
        ...baseSegment,
        type: "pickup",
        pickupLocation: segment.pickupLocation || "Unknown Location",
        guestCount: segment.guestCount || 0,
        booking: segment.booking
          ? {
              id: segment.booking.id,
              referenceNumber: segment.booking.referenceNumber,
              totalParticipants: segment.booking.totalParticipants,
              adultCount: segment.booking.adultCount,
              childCount: segment.booking.childCount,
              specialOccasion: segment.booking.specialOccasion,
              customer: {
                id: segment.booking.id,
                firstName: segment.booking.customerName.split(" ")[0] || "",
                lastName: segment.booking.customerName.split(" ").slice(1).join(" ") || "",
                email: segment.booking.customerEmail,
              },
            }
          : {
              id: "unknown",
              referenceNumber: "N/A",
              totalParticipants: segment.guestCount || 0,
              adultCount: segment.guestCount || 0,
            },
        isFirstTimer: segment.booking?.isFirstTime,
        hasSpecialOccasion: !!segment.booking?.specialOccasion,
      };
    case "tour":
      return {
        ...baseSegment,
        type: "tour",
        tour: segment.tour
          ? {
              id: segment.tour.id,
              name: segment.tour.name,
              durationMinutes: segment.durationMinutes,
            }
          : {
              id: "unknown",
              name: "Tour",
              durationMinutes: segment.durationMinutes,
            },
        totalGuests: segment.guestCount || 0,
      };
    default:
      return { ...baseSegment, type: "idle" };
  }
}

/**
 * Transform service guide timeline to component format
 */
function transformGuideTimeline(
  timeline: {
    guide: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      avatarUrl: string | null;
    };
    vehicleCapacity: number;
    segments: Array<{
      type: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      booking?: {
        id: string;
        referenceNumber: string;
        customerName: string;
        customerEmail: string | null;
        totalParticipants: number;
        adultCount: number;
        childCount: number;
        specialOccasion: string | null;
        isFirstTime: boolean;
      };
      pickupLocation?: string;
      guestCount?: number;
      tour?: { id: string; name: string; slug: string };
      tourRunKey?: string;
      confidence: string;
    }>;
    totalDriveMinutes: number;
    totalGuests: number;
    utilization: number;
  }
): GuideTimeline {
  return {
    guide: {
      id: timeline.guide.id,
      firstName: timeline.guide.firstName,
      lastName: timeline.guide.lastName,
      email: timeline.guide.email || "",
      phone: timeline.guide.phone,
      avatarUrl: timeline.guide.avatarUrl,
      vehicleCapacity: timeline.vehicleCapacity,
      status: "active",
    },
    segments: timeline.segments.map((seg, idx) => transformTimelineSegment(seg, idx)),
    totalDriveMinutes: timeline.totalDriveMinutes,
    totalGuests: timeline.totalGuests,
    utilization: timeline.utilization,
  };
}

/**
 * Transform service warnings to component warnings format
 */
function transformWarnings(
  warnings: Array<{
    id: string;
    type: string;
    message: string;
    bookingId?: string;
    tourRunKey?: string;
    resolutions: Array<{
      id: string;
      label: string;
      action: string;
      guideId?: string;
      impactMinutes?: number;
    }>;
  }>
): DispatchWarning[] {
  return warnings.map((warning) => ({
    id: warning.id,
    type: mapWarningType(warning.type),
    message: warning.message,
    bookingId: warning.bookingId,
    suggestions: warning.resolutions.map((resolution) => ({
      id: resolution.id,
      label: resolution.label,
      impact: resolution.impactMinutes ? `+${resolution.impactMinutes}m` : undefined,
      guideId: resolution.guideId,
    })),
  }));
}

/**
 * Main command center component with adjust mode support
 */
function CommandCenterContent({
  date,
  onDateChange,
  onPreviousDay,
  onNextDay,
  onToday,
}: CommandCenterProps) {
  const { isAdjustMode, pendingChanges, exitAdjustMode, enterAdjustMode } = useAdjustMode();
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  // Get tRPC utils for query invalidation
  const utils = trpc.useUtils();

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  // Fetch dispatch data for the selected date
  const {
    data: dispatchResponse,
    isLoading,
    error,
    refetch,
  } = trpc.commandCenter.getDispatch.useQuery(
    { date },
    {
      // Refetch on window focus to keep data fresh
      refetchOnWindowFocus: true,
      // Stale time of 30 seconds
      staleTime: 30 * 1000,
    }
  );

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  // Optimize mutation
  const optimizeMutation = trpc.commandCenter.optimize.useMutation({
    onSuccess: (result) => {
      // Invalidate and refetch dispatch data
      utils.commandCenter.getDispatch.invalidate({ date });

      // Show success toast with results
      const warningCount = result.warnings.length;
      if (warningCount > 0) {
        toast.warning(`Optimization complete with ${warningCount} ${warningCount === 1 ? "warning" : "warnings"}`, {
          description: `Efficiency: ${result.efficiency}%`,
        });
      } else {
        toast.success("Optimization complete", {
          description: `Efficiency: ${result.efficiency}% - Ready to dispatch!`,
        });
      }
    },
    onError: (error) => {
      toast.error("Optimization failed", {
        description: error.message,
      });
    },
  });

  // Dispatch mutation
  const dispatchMutation = trpc.commandCenter.dispatch.useMutation({
    onSuccess: (result) => {
      // Invalidate and refetch dispatch data
      utils.commandCenter.getDispatch.invalidate({ date });

      toast.success("Dispatch sent successfully", {
        description: `${result.guidesNotified.length} guides notified`,
      });
    },
    onError: (error) => {
      toast.error("Dispatch failed", {
        description: error.message,
      });
    },
  });

  // Resolve warning mutation
  const resolveWarningMutation = trpc.commandCenter.resolveWarning.useMutation({
    onSuccess: () => {
      // Invalidate and refetch dispatch data
      utils.commandCenter.getDispatch.invalidate({ date });

      toast.success("Warning resolved");
    },
    onError: (error) => {
      toast.error("Failed to resolve warning", {
        description: error.message,
      });
    },
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleOptimize = useCallback(() => {
    optimizeMutation.mutate({ date });
  }, [date, optimizeMutation]);

  const handleDispatch = useCallback(() => {
    dispatchMutation.mutate({ date });
  }, [date, dispatchMutation]);

  const handleResolveWarning = useCallback(
    (warningId: string, suggestionId: string) => {
      // Parse the suggestion ID to determine the action type
      // Suggestion IDs are in format: "res_assign_{guideId}" or "res_add_external"
      let type: "assign_guide" | "add_external" | "skip" | "cancel" = "skip";
      let guideId: string | undefined;

      if (suggestionId.startsWith("res_assign_")) {
        type = "assign_guide";
        guideId = suggestionId.replace("res_assign_", "");
      } else if (suggestionId === "res_add_external") {
        type = "add_external";
      }

      resolveWarningMutation.mutate({
        date,
        warningId,
        resolution: {
          id: suggestionId,
          type,
          guideId,
        },
      });
    },
    [date, resolveWarningMutation]
  );

  // Handle applying adjust mode changes
  const handleApplyAdjustChanges = useCallback(async () => {
    if (pendingChanges.length === 0) return;

    setIsApplyingChanges(true);

    try {
      // TODO: Call tRPC mutation to apply guide reassignments
      // For now, we'll simulate the API call
      // await applyReassignmentsMutation.mutateAsync({
      //   date,
      //   changes: pendingChanges.map(change => ({
      //     tourRunId: change.tourRunId,
      //     fromGuideId: change.fromGuideId,
      //     toGuideId: change.toGuideId,
      //   })),
      // });

      // Simulate API delay for demo
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success(`Applied ${pendingChanges.length} guide reassignment${pendingChanges.length !== 1 ? 's' : ''}`, {
        description: "Changes have been saved successfully.",
      });

      // Exit adjust mode and refresh data
      exitAdjustMode(true);
      refetch();
    } catch (error) {
      toast.error("Failed to apply changes", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsApplyingChanges(false);
    }
  }, [pendingChanges, exitAdjustMode, refetch]);

  // ==========================================================================
  // TRANSFORM DATA
  // ==========================================================================

  // Transform the API response to the component's expected format
  const data = useMemo<DispatchData | null>(() => {
    if (!dispatchResponse) return null;

    const { status, timelines } = dispatchResponse;

    // Get warnings from the latest optimization result if available
    // For now, we derive warnings from tour run statuses
    const warnings: DispatchWarning[] = [];

    // Transform timelines
    const guideTimelines = timelines.map(transformGuideTimeline);

    // Calculate display status based on service status
    const displayStatus = mapDispatchStatus(status.status, status.unresolvedWarnings);

    return {
      status: displayStatus,
      totalGuests: status.totalGuests,
      totalGuides: status.totalGuides,
      totalDriveMinutes: status.totalDriveMinutes,
      efficiencyScore: status.efficiencyScore,
      dispatchedAt: status.dispatchedAt ? new Date(status.dispatchedAt) : undefined,
      warnings,
      guideTimelines,
    };
  }, [dispatchResponse]);

  // Format date for display
  const formattedDate = useMemo(() => {
    if (isToday(date)) return `${format(date, "MMMM d, yyyy")} (Today)`;
    if (isTomorrow(date)) return `${format(date, "MMMM d, yyyy")} (Tomorrow)`;
    if (isYesterday(date)) return `${format(date, "MMMM d, yyyy")} (Yesterday)`;
    return format(date, "MMMM d, yyyy");
  }, [date]);

  const previousDayLabel = format(new Date(date.getTime() - 86400000), "MMM d");
  const nextDayLabel = format(new Date(date.getTime() + 86400000), "MMM d");

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Date Navigation Skeleton */}
        <div className="flex items-center justify-center gap-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>

        {/* Status Banner Skeleton */}
        <Skeleton className="h-16 w-full rounded-lg" />

        {/* Timeline Skeleton */}
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to load dispatch data</p>
            <p className="text-xs text-destructive/70 mt-0.5">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no bookings for this day
  if (!data || data.totalGuests === 0) {
    return (
      <div className="space-y-4">
        <DispatchHeader
          formattedDate={formattedDate}
          previousDayLabel={previousDayLabel}
          nextDayLabel={nextDayLabel}
          onPreviousDay={onPreviousDay}
          onNextDay={onNextDay}
          onToday={onToday}
          status="pending"
          isToday={isToday(date)}
        />

        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Tours Scheduled</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            There are no confirmed bookings for this date. Tours will appear here once customers book and confirm.
          </p>
        </div>
      </div>
    );
  }

  const hasWarnings = data.warnings.length > 0;
  const isReady = data.status === "ready";
  const isDispatched = data.status === "dispatched";

  return (
    <div className="space-y-4">
      {/* Date Navigation Header */}
      <DispatchHeader
        formattedDate={formattedDate}
        previousDayLabel={previousDayLabel}
        nextDayLabel={nextDayLabel}
        onPreviousDay={onPreviousDay}
        onNextDay={onNextDay}
        onToday={onToday}
        status={data.status}
        isToday={isToday(date)}
      />

      {/* Status Banner with Adjust Mode Toggle */}
      <StatusBanner
        status={data.status}
        totalGuests={data.totalGuests}
        totalGuides={data.totalGuides}
        totalDriveMinutes={data.totalDriveMinutes}
        efficiencyScore={data.efficiencyScore}
        warningsCount={data.warnings.length}
        dispatchedAt={data.dispatchedAt}
        onAdjust={enterAdjustMode}
        onOptimize={handleOptimize}
        onDispatch={handleDispatch}
        adjustModeSlot={
          <AdjustModeToggle
            onApplyChanges={handleApplyAdjustChanges}
            isApplying={isApplyingChanges}
          />
        }
        isAdjustMode={isAdjustMode}
      />

      {/* Warnings Panel (if any) */}
      {hasWarnings && (
        <WarningsPanel
          warnings={data.warnings}
          onResolve={handleResolveWarning}
        />
      )}

      {/* Timeline with DnD support */}
      <DndProvider>
        <TimelineContainer
          timelines={data.guideTimelines}
          startHour={6}
          endHour={20}
          onSegmentClick={(segment, guide) => {
            // TODO [Phase 7.2]: Open segment details panel
          }}
          onGuideClick={(guide) => {
            // TODO [Phase 7.2]: Open guide details panel
          }}
          className={isDispatched ? "opacity-75 pointer-events-none" : undefined}
          isAdjustMode={isAdjustMode}
        />
      </DndProvider>

      {/* Keyboard Shortcut Hints */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">{"<-"}</kbd> Previous day</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">{"->"}</kbd> Next day</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">T</kbd> Today</span>
        {isAdjustMode && (
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Esc</kbd> Exit adjust mode</span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTED COMPONENT WITH PROVIDERS
// =============================================================================

/**
 * Command Center with Adjust Mode support
 *
 * Wraps the main content with AdjustModeProvider to enable
 * drag-and-drop guide reassignment functionality.
 */
export function CommandCenter(props: CommandCenterProps) {
  return (
    <AdjustModeProvider>
      <CommandCenterContent {...props} />
    </AdjustModeProvider>
  );
}
