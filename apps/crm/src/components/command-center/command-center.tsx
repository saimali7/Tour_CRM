"use client";

import { useMemo, useCallback, useState } from "react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { DispatchHeader } from "./dispatch-header";
import { StatusBanner } from "./status-banner";
import { WarningsPanel } from "./warnings-panel";
import { TimelineContainer } from "./timeline/timeline-container";
import { GuestCard, type GuestCardBooking } from "./guest-card";
import { GuideCard, type GuideCardData } from "./guide-card";
import { HopperPanel, type HopperBooking } from "./hopper";
import { MapPanel, type RouteStop, type GhostPreviewData } from "./map-panel";
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
                firstName: segment.booking.customerName?.split(" ")[0] ?? "",
                lastName: segment.booking.customerName?.split(" ").slice(1).join(" ") ?? "",
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

  // Panel state for guest and guide details
  const [selectedGuest, setSelectedGuest] = useState<GuestCardBooking | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideCardData | null>(null);

  // State for the three-panel layout
  const [selectedTimelineGuideId, setSelectedTimelineGuideId] = useState<string | null>(null);
  const [ghostPreview, setGhostPreview] = useState<GhostPreviewData | null>(null);

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

  // Apply reassignments mutation
  const applyReassignmentsMutation = trpc.commandCenter.applyReassignments.useMutation({
    onSuccess: (result) => {
      utils.commandCenter.getDispatch.invalidate({ date });

      if (result.failed > 0) {
        toast.warning(`Applied ${result.applied} reassignment${result.applied !== 1 ? "s" : ""}, ${result.failed} failed`, {
          description: "Some changes could not be applied.",
        });
      } else {
        toast.success(`Applied ${result.applied} guide reassignment${result.applied !== 1 ? "s" : ""}`, {
          description: "Changes have been saved successfully.",
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to apply changes", {
        description: error.message,
      });
    },
  });

  // Handle applying adjust mode changes
  const handleApplyAdjustChanges = useCallback(async () => {
    if (pendingChanges.length === 0) return;

    setIsApplyingChanges(true);

    try {
      // Transform pending changes to the mutation format
      // Each change may have multiple booking IDs or a single segment
      const changes = pendingChanges.flatMap((change) => {
        if (change.bookingIds && change.bookingIds.length > 0) {
          // Multiple bookings in this segment
          return change.bookingIds.map((bookingId) => ({
            bookingId,
            fromGuideId: change.fromGuideId || null,
            toGuideId: change.toGuideId,
          }));
        }
        // Single segment - extract booking ID from segment if available
        // For now, we'll use the segmentId as a fallback
        return [{
          bookingId: change.segmentId,
          fromGuideId: change.fromGuideId || null,
          toGuideId: change.toGuideId,
        }];
      });

      await applyReassignmentsMutation.mutateAsync({
        date,
        changes,
      });

      // Exit adjust mode and refresh data
      exitAdjustMode(true);
      refetch();
    } catch (error) {
      // Error handling is done in mutation onError
    } finally {
      setIsApplyingChanges(false);
    }
  }, [pendingChanges, date, applyReassignmentsMutation, exitAdjustMode, refetch]);

  // Handle segment click to open guest details panel
  const handleSegmentClick = useCallback((segment: TimelineSegment, guide: GuideInfo) => {
    // Only open panel for pickup segments with booking info
    if (segment.type === "pickup" && segment.booking) {
      const booking = segment.booking;
      const guestData: GuestCardBooking = {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        customerName: booking.customer
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : "Unknown Customer",
        customerEmail: booking.customer?.email,
        customerPhone: undefined, // Not available in segment data
        guestCount: booking.totalParticipants,
        adultCount: booking.adultCount ?? booking.totalParticipants,
        childCount: booking.childCount,
        pickupLocation: segment.pickupLocation,
        pickupTime: segment.startTime,
        specialOccasion: booking.specialOccasion,
        tourName: guide.firstName, // Will be enhanced when we have tour data
        tourTime: `${segment.startTime} - ${segment.endTime}`,
        status: "confirmed",
        paymentStatus: "paid",
        total: "0.00",
        currency: "USD",
      };
      setSelectedGuest(guestData);
    }
  }, []);

  // Handle guide click - defined as a function that uses dispatchResponse directly
  // to avoid circular dependency with the data memoization
  const handleGuideClick = useCallback((guide: GuideInfo) => {
    if (!dispatchResponse) return;

    // Transform timelines from response
    const timelines = dispatchResponse.timelines.map(transformGuideTimeline);

    // Find the full timeline for this guide to get assignments
    const timeline = timelines.find(t => t.guide.id === guide.id);

    // Extract tour assignments from segments
    const tourSegments = timeline?.segments.filter(s => s.type === "tour") || [];
    const assignments = tourSegments.map((seg, idx) => ({
      tourRunId: `tour_${idx}`,
      tourName: seg.type === "tour" && seg.tour ? seg.tour.name : "Tour",
      startTime: seg.startTime,
      endTime: seg.endTime,
      guestCount: seg.type === "tour" ? seg.totalGuests ?? 0 : 0,
      pickupCount: 0, // Would need to count pickup segments
    }));

    const guideData: GuideCardData = {
      id: guide.id,
      name: `${guide.firstName} ${guide.lastName}`.trim(),
      email: guide.email,
      phone: guide.phone,
      avatarUrl: guide.avatarUrl,
      vehicleCapacity: guide.vehicleCapacity ?? 6,
      status: assignments.length > 0 ? "assigned" : "available",
      totalAssignments: assignments.length,
      totalGuests: timeline?.totalGuests ?? 0,
      totalDriveMinutes: timeline?.totalDriveMinutes ?? 0,
      assignments,
    };
    setSelectedGuide(guideData);
  }, [dispatchResponse]);

  // ==========================================================================
  // TRANSFORM DATA
  // ==========================================================================

  // Transform the API response to the component's expected format
  const data = useMemo<DispatchData | null>(() => {
    if (!dispatchResponse) return null;

    const { status, tourRuns, timelines } = dispatchResponse;

    // Generate warnings from tour runs that need attention
    const warnings: DispatchWarning[] = [];

    if (tourRuns) {
      for (const run of tourRuns) {
        // Tour run needs guides
        if (run.status === "unassigned") {
          warnings.push({
            id: `warning_${run.key}_unassigned`,
            type: "no_guide",
            message: `${run.tour?.name || "Tour"} at ${run.time} has no guide assigned (${run.totalGuests} guests)`,
            suggestions: [], // Could populate with available guides
          });
        } else if (run.status === "partial") {
          warnings.push({
            id: `warning_${run.key}_partial`,
            type: "capacity",
            message: `${run.tour?.name || "Tour"} at ${run.time} needs ${run.guidesNeeded - run.guidesAssigned} more guide(s)`,
            guestCount: run.totalGuests,
            suggestions: [],
          });
        } else if (run.status === "overstaffed") {
          warnings.push({
            id: `warning_${run.key}_overstaffed`,
            type: "conflict",
            message: `${run.tour?.name || "Tour"} at ${run.time} has too many guides assigned`,
            suggestions: [],
          });
        }
      }
    }

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

  // Extract unassigned bookings for the hopper panel
  const hopperBookings = useMemo<HopperBooking[]>(() => {
    if (!dispatchResponse?.tourRuns) return [];

    const unassigned: HopperBooking[] = [];

    for (const run of dispatchResponse.tourRuns) {
      // Only include bookings from unassigned or partial tour runs
      if (run.status === "unassigned" || run.status === "partial") {
        for (const booking of run.bookings) {
          unassigned.push({
            id: booking.id,
            referenceNumber: booking.referenceNumber,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            guestCount: booking.totalParticipants,
            adultCount: booking.adultCount,
            childCount: booking.childCount,
            infantCount: booking.infantCount,
            pickupZone: booking.pickupZoneId
              ? {
                  id: booking.pickupZoneId,
                  name: booking.pickupLocation || "Unknown Zone",
                  color: "#6B7280", // Default color, will be enhanced with actual zone data
                }
              : null,
            pickupLocation: booking.pickupLocation,
            pickupTime: booking.pickupTime,
            tourName: run.tour?.name || "Tour",
            tourTime: run.time,
            tourRunKey: run.key,
            isVIP: false, // Could enhance with customer data
            isFirstTimer: booking.isFirstTime,
            specialOccasion: booking.specialOccasion,
            accessibilityNeeds: booking.accessibilityNeeds,
            hasChildren: booking.childCount > 0 || booking.infantCount > 0,
          });
        }
      }
    }

    return unassigned;
  }, [dispatchResponse]);

  // Get route stops for the selected guide (for map panel)
  const selectedGuideRouteStops = useMemo<RouteStop[]>(() => {
    if (!selectedTimelineGuideId || !data?.guideTimelines) return [];

    const timeline = data.guideTimelines.find(
      (t) => t.guide.id === selectedTimelineGuideId
    );
    if (!timeline) return [];

    const stops: RouteStop[] = [];
    for (const segment of timeline.segments) {
      if (segment.type === "pickup") {
        stops.push({
          id: segment.id,
          type: "pickup",
          name: segment.pickupLocation || "Pickup",
          time: segment.startTime,
          guestCount: segment.guestCount,
          // Zone data would be enhanced with actual zone lookup
        });
      } else if (segment.type === "tour") {
        stops.push({
          id: segment.id,
          type: "tour",
          name: segment.tour?.name || "Tour",
          time: segment.startTime,
          guestCount: segment.totalGuests,
        });
      }
    }

    return stops;
  }, [selectedTimelineGuideId, data?.guideTimelines]);

  // Get the selected guide's name and total drive minutes
  const selectedGuideInfo = useMemo(() => {
    if (!selectedTimelineGuideId || !data?.guideTimelines) return null;

    const timeline = data.guideTimelines.find(
      (t) => t.guide.id === selectedTimelineGuideId
    );
    if (!timeline) return null;

    return {
      name: `${timeline.guide.firstName} ${timeline.guide.lastName}`.trim(),
      totalDriveMinutes: timeline.totalDriveMinutes,
    };
  }, [selectedTimelineGuideId, data?.guideTimelines]);

  // Format date for display
  const formattedDate = useMemo(() => {
    if (isToday(date)) return `${format(date, "MMMM d, yyyy")} (Today)`;
    if (isTomorrow(date)) return `${format(date, "MMMM d, yyyy")} (Tomorrow)`;
    if (isYesterday(date)) return `${format(date, "MMMM d, yyyy")} (Yesterday)`;
    return format(date, "MMMM d, yyyy");
  }, [date]);

  // Memoize date navigation labels to prevent recalculation on every render
  const { previousDayLabel, nextDayLabel } = useMemo(() => ({
    previousDayLabel: format(new Date(date.getTime() - 86400000), "MMM d"),
    nextDayLabel: format(new Date(date.getTime() + 86400000), "MMM d"),
  }), [date]);

  // Handler to select a guide when clicking their row (for map panel)
  // IMPORTANT: This hook must be defined before any early returns to maintain hooks order
  const handleTimelineGuideClick = useCallback((guide: GuideInfo) => {
    setSelectedTimelineGuideId(guide.id);
    handleGuideClick(guide); // Also open the guide card
  }, [handleGuideClick]);

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

      {/* Warnings Panel (if any) - only show when not in adjust mode */}
      {hasWarnings && !isAdjustMode && (
        <WarningsPanel
          warnings={data.warnings}
          onResolve={handleResolveWarning}
        />
      )}

      {/* Main Content Area */}
      <DndProvider>
        {isAdjustMode ? (
          /* ============================================================
           * THREE-PANEL LAYOUT (Adjust Mode)
           * Hopper (left) | Timeline (center) | Map (right)
           * Responsive: xl=3-panel, lg=2-panel, md/sm=timeline only
           * ============================================================ */
          <div className={cn(
            "rounded-lg border border-border overflow-hidden",
            "h-[calc(100vh-280px)] min-h-[500px]",
            // Responsive grid
            "grid grid-cols-1",
            "lg:grid-cols-[280px_1fr]",
            "xl:grid-cols-[280px_1fr_260px]"
          )}>
            {/* Left Panel: Hopper - Unassigned Bookings (hidden on mobile) */}
            <div className="hidden lg:block">
              <HopperPanel
                bookings={hopperBookings}
                onBookingClick={(booking) => {
                  toast.info(`Selected: ${booking.customerName}`);
                }}
                isLoading={isLoading}
              />
            </div>

            {/* Center Panel: Guide Dispatch Timeline */}
            <div className="overflow-hidden bg-card">
              <TimelineContainer
                timelines={data.guideTimelines}
                startHour={6}
                endHour={20}
                onSegmentClick={handleSegmentClick}
                onGuideClick={handleTimelineGuideClick}
                className={cn(
                  "h-full",
                  isDispatched && "opacity-75 pointer-events-none"
                )}
                isAdjustMode={isAdjustMode}
              />
            </div>

            {/* Right Panel: Map / Route Context (hidden on lg and below) */}
            <div className="hidden xl:block">
              <MapPanel
                selectedGuideId={selectedTimelineGuideId}
                selectedGuideName={selectedGuideInfo?.name}
                routeStops={selectedGuideRouteStops}
                totalDriveMinutes={selectedGuideInfo?.totalDriveMinutes}
                ghostPreview={ghostPreview}
              />
            </div>
          </div>
        ) : (
          /* ============================================================
           * STANDARD LAYOUT (Normal Mode)
           * Full-width timeline
           * ============================================================ */
          <TimelineContainer
            timelines={data.guideTimelines}
            startHour={6}
            endHour={20}
            onSegmentClick={handleSegmentClick}
            onGuideClick={handleGuideClick}
            className={isDispatched ? "opacity-75 pointer-events-none" : undefined}
            isAdjustMode={isAdjustMode}
          />
        )}
      </DndProvider>

      {/* Guest Details Panel */}
      <GuestCard
        open={!!selectedGuest}
        onClose={() => setSelectedGuest(null)}
        booking={selectedGuest}
        onViewBooking={(bookingId) => {
          // Could navigate to booking detail page
          toast.info("View booking feature coming soon");
        }}
      />

      {/* Guide Details Panel */}
      <GuideCard
        open={!!selectedGuide}
        onClose={() => setSelectedGuide(null)}
        guide={selectedGuide}
        onViewProfile={(guideId) => {
          // Could navigate to guide profile page
          toast.info("View profile feature coming soon");
        }}
      />

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

import { CommandCenterErrorBoundary } from "./command-center-error-boundary";

/**
 * Command Center with Adjust Mode and Error Boundary support
 *
 * Wraps the main content with:
 * - ErrorBoundary for graceful error handling
 * - AdjustModeProvider for drag-and-drop guide reassignment
 */
export function CommandCenter(props: CommandCenterProps) {
  return (
    <CommandCenterErrorBoundary>
      <AdjustModeProvider>
        <CommandCenterContent {...props} />
      </AdjustModeProvider>
    </CommandCenterErrorBoundary>
  );
}
