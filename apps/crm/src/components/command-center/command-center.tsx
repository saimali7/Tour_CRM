"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { CommandStrip } from "./command-strip";
import { WarningsPanel } from "./warnings-panel";
import { MapPanel, type RouteStop, type ZoneDistribution, type TourRunSummary } from "./map-panel";
import { TimelineContainer } from "./timeline/timeline-container";
import { GuestCard, type GuestCardBooking } from "./guest-card";
import { GuideCard, type GuideCardData } from "./guide-card";
import { HopperPanel, type HopperBooking, MobileHopperSheet } from "./hopper";
import { LiveAnnouncerProvider, useLiveAnnouncer } from "./live-announcer";
import { DispatchConfirmDialog } from "./dispatch-confirm-dialog";
import { CapacityOverrideDialog } from "./capacity-override-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { GuideTimeline, TimelineSegment, GuideInfo } from "./timeline/types";
import {
  AdjustModeProvider,
  AdjustModeToggle,
  DndProvider,
  GhostPreviewProvider,
  PendingChangesPanel,
  useAdjustMode,
  type PendingChange,
  type PendingAssignChange,
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
    pickupZoneName?: string;
    pickupZoneColor?: string;
    guestCount?: number;
    tour?: { id: string; name: string; slug: string };
    tourRunKey?: string;
    confidence: string;
  },
  index: number
): TimelineSegment {
  // Generate stable segment ID based on type and content
  // This ensures IDs are consistent across re-renders
  let segmentId: string;
  if (segment.type === "pickup" && segment.booking?.id) {
    segmentId = `pickup_${segment.booking.id}`;
  } else if (segment.type === "tour" && segment.tourRunKey) {
    segmentId = `tour_${segment.tourRunKey}`;
  } else if (segment.type === "tour" && segment.tour?.id) {
    segmentId = `tour_${segment.tour.id}_${segment.startTime}`;
  } else {
    // Fallback for idle/drive segments - use type + time for uniqueness
    segmentId = `${segment.type}_${segment.startTime}_${index}`;
  }

  const baseSegment = {
    id: segmentId,
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
        pickupZoneName: segment.pickupZoneName,
        pickupZoneColor: segment.pickupZoneColor,
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
        scheduleId: segment.tourRunKey, // For tracking which tour run this belongs to
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
 * Apply pending assign changes to guide timelines
 * This creates tour segments for bookings that have been dragged from hopper
 */
function applyPendingAssignments(
  timelines: GuideTimeline[],
  pendingChanges: PendingChange[]
): GuideTimeline[] {
  // Filter to only assign type changes
  const assignChanges = pendingChanges.filter(
    (c): c is PendingAssignChange => c.type === "assign"
  );

  if (assignChanges.length === 0) return timelines;

  // Group assign changes by timeline index (not just guide ID)
  const changesByTimelineIndex = new Map<number, PendingAssignChange[]>();
  for (const change of assignChanges) {
    const existing = changesByTimelineIndex.get(change.timelineIndex) || [];
    existing.push(change);
    changesByTimelineIndex.set(change.timelineIndex, existing);
  }

  // Apply changes to each timeline by index
  return timelines.map((timeline, index) => {
    const timelineChanges = changesByTimelineIndex.get(index);
    if (!timelineChanges || timelineChanges.length === 0) return timeline;

    // Create new segments for assigned bookings
    const newSegments: TimelineSegment[] = timelineChanges.map((change, idx) => {
      const { bookingData } = change;
      // Parse tour time to calculate end time (assume 2 hour tour)
      const [hours, minutes] = bookingData.tourTime.split(":").map(Number);
      const endHours = (hours ?? 0) + 2;
      const endTime = `${endHours.toString().padStart(2, "0")}:${(minutes ?? 0).toString().padStart(2, "0")}`;

      return {
        id: `pending_${change.bookingId}_${idx}`,
        type: "tour" as const,
        startTime: bookingData.tourTime,
        endTime,
        durationMinutes: 120,
        confidence: "good" as const,
        tour: {
          id: `tour_${change.bookingId}`,
          name: bookingData.tourName,
          durationMinutes: 120,
        },
        totalGuests: bookingData.guestCount,
        scheduleId: change.bookingId,
      };
    });

    // Merge new segments with existing, sorted by start time
    const allSegments = [...timeline.segments, ...newSegments].sort((a, b) => {
      const aTime = a.startTime.split(":").map(Number);
      const bTime = b.startTime.split(":").map(Number);
      return ((aTime[0] ?? 0) * 60 + (aTime[1] ?? 0)) - ((bTime[0] ?? 0) * 60 + (bTime[1] ?? 0));
    });

    // Calculate updated totals
    const addedGuests = timelineChanges.reduce((sum, c) => sum + c.bookingData.guestCount, 0);

    return {
      ...timeline,
      segments: allSegments,
      totalGuests: timeline.totalGuests + addedGuests,
    };
  });
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
  const { isAdjustMode, pendingChanges, pendingChangesCount, hasPendingChanges, exitAdjustMode, enterAdjustMode } = useAdjustMode();
  const { announce } = useLiveAnnouncer();
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);

  // Panel state for guest and guide details
  const [selectedGuest, setSelectedGuest] = useState<GuestCardBooking | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideCardData | null>(null);

  // State for the three-panel layout
  const [selectedTimelineGuideId, setSelectedTimelineGuideId] = useState<string | null>(null);

  // Dispatch confirmation dialog state
  const [showDispatchConfirm, setShowDispatchConfirm] = useState(false);

  // Ref for timeline container (used for time calculations in drag/drop)
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Timeline configuration for time-shift calculations
  const timelineConfig = useMemo(() => ({
    startHour: 6,
    endHour: 20,
    snapMinutes: 15,
    guideColumnWidth: 200, // Must match the guideColumnWidth prop in TimelineContainer
  }), []);

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

      // Announce for screen readers
      announce(`Dispatch sent. ${result.guidesNotified.length} guides notified.`, "assertive");
    },
    onError: (error) => {
      toast.error("Dispatch failed", {
        description: error.message,
      });

      // Announce error for screen readers
      announce(`Dispatch failed: ${error.message}`, "assertive");
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

  // Open dispatch confirmation dialog
  const handleDispatch = useCallback(() => {
    setShowDispatchConfirm(true);
  }, []);

  // Actually send dispatch after confirmation
  const handleConfirmDispatch = useCallback(() => {
    dispatchMutation.mutate({ date });
    setShowDispatchConfirm(false);
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
        // Handle new booking assignments from hopper
        if (change.type === "assign") {
          return [{
            bookingId: change.bookingId,
            fromGuideId: null, // No previous guide for hopper assignments
            toGuideId: change.toGuideId,
          }];
        }

        // Handle time-shift changes (for now just log them - backend support needed)
        if (change.type === "time-shift") {
          // TODO: Implement time-shift mutations when backend is ready
          console.log("Time shift pending:", {
            segmentId: change.segmentId,
            originalStartTime: change.originalStartTime,
            newStartTime: change.newStartTime,
          });
          // For now, skip time-shift changes (visual feedback is the main feature)
          return [];
        }

        // Handle reassign/swap changes
        if (change.type === "reassign" || change.type === "swap") {
          if (change.bookingIds && change.bookingIds.length > 0) {
            // Has explicit booking IDs - use them
            return change.bookingIds.map((bookingId) => ({
              bookingId,
              fromGuideId: change.fromGuideId || null,
              toGuideId: change.toGuideId,
            }));
          }

          // For segments without explicit booking IDs (like tour segments),
          // extract booking ID from segment ID format: "pickup_{bookingId}" or "tour_{tourRunKey}"
          const segmentId = change.segmentId;
          if (segmentId.startsWith("pickup_")) {
            // Extract booking ID from pickup segment
            const bookingId = segmentId.replace("pickup_", "");
            return [{
              bookingId,
              fromGuideId: change.fromGuideId || null,
              toGuideId: change.toGuideId,
            }];
          }

          // For tour segments, we use the tourRunId which should be the schedule/run key
          // The backend will need to look up all bookings for this tour run
          if (segmentId.startsWith("tour_")) {
            // Tour reassignment - use tourRunId (which is the tourRunKey)
            return [{
              bookingId: change.tourRunId, // Backend handles tour run reassignment
              fromGuideId: change.fromGuideId || null,
              toGuideId: change.toGuideId,
              isTourRun: true, // Flag for backend to handle differently
            }];
          }

          // Skip segments without proper IDs (shouldn't happen with fixed ID generation)
          console.warn("Skipping segment without proper ID:", segmentId);
          return [];
        }

        // Unknown change type - skip
        return [];
      });

      // Filter out empty changes
      const validChanges = changes.filter((c) => c.bookingId);

      if (validChanges.length === 0) {
        toast.warning("No valid changes to apply");
        setIsApplyingChanges(false);
        return;
      }

      await applyReassignmentsMutation.mutateAsync({
        date,
        changes: validChanges,
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
            message: `${run.tour?.name || "Tour"} at ${run.time} has no guide assigned (${run.totalGuests} ${run.totalGuests === 1 ? "guest" : "guests"})`,
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
            pickupZone: booking.pickupZone ?? null,
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

  // Apply pending assign changes to timelines (for visual preview in adjust mode)
  const timelinesWithPendingChanges = useMemo(() => {
    if (!data?.guideTimelines) return [];
    return applyPendingAssignments(data.guideTimelines, pendingChanges);
  }, [data?.guideTimelines, pendingChanges]);

  // Filter out bookings that have been assigned via pending changes
  const filteredHopperBookings = useMemo(() => {
    const assignedBookingIds = new Set(
      pendingChanges
        .filter((c): c is PendingAssignChange => c.type === "assign")
        .map((c) => c.bookingId)
    );
    return hopperBookings.filter((b) => !assignedBookingIds.has(b.id));
  }, [hopperBookings, pendingChanges]);

  // Get route stops for the selected guide (for map panel)
  const selectedGuideRouteStops = useMemo<RouteStop[]>(() => {
    if (!selectedTimelineGuideId || timelinesWithPendingChanges.length === 0) return [];

    const timeline = timelinesWithPendingChanges.find(
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
  }, [selectedTimelineGuideId, timelinesWithPendingChanges]);

  // Get the selected guide's name and total drive minutes
  const selectedGuideInfo = useMemo(() => {
    if (!selectedTimelineGuideId || timelinesWithPendingChanges.length === 0) return null;

    const timeline = timelinesWithPendingChanges.find(
      (t) => t.guide.id === selectedTimelineGuideId
    );
    if (!timeline) return null;

    return {
      name: `${timeline.guide.firstName} ${timeline.guide.lastName}`.trim(),
      totalDriveMinutes: timeline.totalDriveMinutes,
    };
  }, [selectedTimelineGuideId, timelinesWithPendingChanges]);

  // Format date for display - simpler format for CommandStrip
  const formattedDate = useMemo(() => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEE, MMM d");
  }, [date]);

  // Compute zone distribution for map panel
  const zoneDistribution = useMemo<ZoneDistribution[]>(() => {
    if (!dispatchResponse?.tourRuns) return [];

    const zoneMap = new Map<string, ZoneDistribution>();

    for (const run of dispatchResponse.tourRuns) {
      for (const booking of run.bookings) {
        const zone = booking.pickupZone;
        if (!zone) continue;

        const existing = zoneMap.get(zone.id);
        const isAssigned = run.guidesAssigned > 0;

        if (existing) {
          existing.bookingCount += 1;
          existing.guestCount += booking.totalParticipants;
          if (isAssigned) {
            existing.assignedCount += 1;
          } else {
            existing.unassignedCount += 1;
          }
        } else {
          zoneMap.set(zone.id, {
            id: zone.id,
            name: zone.name,
            color: zone.color || "#6B7280",
            bookingCount: 1,
            guestCount: booking.totalParticipants,
            assignedCount: isAssigned ? 1 : 0,
            unassignedCount: isAssigned ? 0 : 1,
          });
        }
      }
    }

    return Array.from(zoneMap.values());
  }, [dispatchResponse]);

  // Compute tour run summary for map panel
  const tourRunSummary = useMemo<TourRunSummary[]>(() => {
    if (!dispatchResponse?.tourRuns) return [];

    return dispatchResponse.tourRuns.map((run) => ({
      tourRunKey: run.key,
      tourName: run.tour?.name || "Tour",
      time: run.time,
      guestCount: run.totalGuests,
      hasGuide: run.guidesAssigned > 0,
    }));
  }, [dispatchResponse]);

  // Compute assigned guests count
  const assignedGuests = useMemo(() => {
    if (!dispatchResponse?.tourRuns) return 0;

    return dispatchResponse.tourRuns
      .filter((run) => run.guidesAssigned > 0)
      .reduce((sum, run) => sum + run.totalGuests, 0);
  }, [dispatchResponse]);

  // Compute guide capacities for PendingChangesPanel capacity validation
  const guideCapacities = useMemo(() => {
    const capacityMap = new Map<string, { current: number; capacity: number; name: string }>();
    for (const timeline of timelinesWithPendingChanges) {
      capacityMap.set(timeline.guide.id, {
        current: timeline.totalGuests,
        capacity: timeline.guide.vehicleCapacity,
        name: `${timeline.guide.firstName} ${timeline.guide.lastName}`.trim(),
      });
    }
    return capacityMap;
  }, [timelinesWithPendingChanges]);

  // Handler to select a guide when clicking their row (for map panel)
  // IMPORTANT: This hook must be defined before any early returns to maintain hooks order
  const handleTimelineGuideClick = useCallback((guide: GuideInfo) => {
    setSelectedTimelineGuideId(guide.id);
    handleGuideClick(guide); // Also open the guide card
  }, [handleGuideClick]);

  // ==========================================================================
  // KEYBOARD SHORTCUTS
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key) {
        case "Escape":
          if (isAdjustMode) {
            event.preventDefault();
            exitAdjustMode(false); // Discard changes
          }
          break;
        case "ArrowLeft":
          event.preventDefault();
          onPreviousDay();
          break;
        case "ArrowRight":
          event.preventDefault();
          onNextDay();
          break;
        case "t":
        case "T":
          event.preventDefault();
          onToday();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdjustMode, exitAdjustMode, onPreviousDay, onNextDay, onToday]);

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
      <div className="space-y-2">
        <CommandStrip
          date={date}
          formattedDate={formattedDate}
          onPreviousDay={onPreviousDay}
          onNextDay={onNextDay}
          onToday={onToday}
          status="pending"
          totalGuests={0}
          totalGuides={0}
          efficiencyScore={0}
          unassignedCount={0}
          warningsCount={0}
          isAdjustMode={false}
          pendingChangesCount={0}
          onEnterAdjustMode={enterAdjustMode}
          onExitAdjustMode={() => exitAdjustMode(false)}
          onApplyChanges={handleApplyAdjustChanges}
          onOptimize={handleOptimize}
          onDispatch={handleDispatch}
        />

        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-medium text-foreground mb-1.5">No Tours Scheduled</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No confirmed bookings for this date. Tours appear here once booked.
          </p>
        </div>
      </div>
    );
  }

  const hasWarnings = data.warnings.length > 0;
  const hasUnassigned = hopperBookings.length > 0;
  const isDispatched = data.status === "dispatched";

  // Show three-panel layout when:
  // 1. In adjust mode (always), OR
  // 2. There are unassigned bookings (even in normal mode)
  const showThreePanelLayout = isAdjustMode || hasUnassigned;

  return (
    <div className="space-y-2">
      {/* Command Strip - Unified header with date nav, status, and actions */}
      <CommandStrip
        date={date}
        formattedDate={formattedDate}
        onPreviousDay={onPreviousDay}
        onNextDay={onNextDay}
        onToday={onToday}
        status={data.status}
        totalGuests={data.totalGuests}
        totalGuides={data.totalGuides}
        efficiencyScore={data.efficiencyScore}
        unassignedCount={hopperBookings.length}
        warningsCount={data.warnings.length}
        dispatchedAt={data.dispatchedAt}
        isAdjustMode={isAdjustMode}
        pendingChangesCount={pendingChangesCount}
        onEnterAdjustMode={enterAdjustMode}
        onExitAdjustMode={() => exitAdjustMode(false)}
        onApplyChanges={handleApplyAdjustChanges}
        onOptimize={handleOptimize}
        onDispatch={handleDispatch}
        isApplying={isApplyingChanges}
      />

      {/* Warnings Panel - collapsed by default, only in normal mode */}
      {hasWarnings && !isAdjustMode && (
        <WarningsPanel
          warnings={data.warnings}
          onResolve={handleResolveWarning}
          defaultCollapsed={true}
        />
      )}

      {/* Main Content Area */}
      <DndProvider
        guideTimelines={timelinesWithPendingChanges.map((t) => ({
          guide: t.guide,
          totalGuests: t.totalGuests,
          vehicleCapacity: t.guide.vehicleCapacity,
        }))}
        timelineConfig={timelineConfig}
        timelineContainerRef={timelineContainerRef}
        onBookingAssign={(bookingId, guideId) => {
          // Toast notification - pending change is added by DndProvider
          const guide = timelinesWithPendingChanges.find((t) => t.guide.id === guideId);
          const guideName = guide ? `${guide.guide.firstName} ${guide.guide.lastName}` : "guide";
          toast.success(`Assigned booking to ${guideName}`);
        }}
      >
        {showThreePanelLayout ? (
          /* ============================================================
           * THREE-PANEL LAYOUT
           * Shown when: adjust mode OR there are unassigned bookings
           * Hopper (left) | Timeline (center) | Map (right)
           * Responsive: xl=3-panel, lg=2-panel, md/sm=timeline only
           * ============================================================ */
          <div className={cn(
            "rounded-lg border border-border overflow-hidden",
            "h-[calc(100vh-180px)] min-h-[480px]",
            // Responsive grid - tighter panels
            "grid grid-cols-1",
            "lg:grid-cols-[260px_1fr]",
            "xl:grid-cols-[260px_1fr_260px]"
          )}>
            {/* Left Panel: Hopper - Unassigned Bookings (hidden on mobile) */}
            <div className="hidden lg:block">
              <HopperPanel
                bookings={filteredHopperBookings}
                onBookingClick={(booking) => {
                  toast.info(`Selected: ${booking.customerName}`);
                }}
                isLoading={isLoading}
              />
            </div>

            {/* Center Panel: Guide Dispatch Timeline */}
            <div className="overflow-hidden bg-card border-x border-border">
              <TimelineContainer
                timelines={timelinesWithPendingChanges}
                startHour={6}
                endHour={20}
                onSegmentClick={handleSegmentClick}
                onGuideClick={handleTimelineGuideClick}
                className={cn(
                  "h-full",
                  isDispatched && "opacity-75 pointer-events-none"
                )}
                isAdjustMode={isAdjustMode}
                timelineContentRef={timelineContainerRef}
              />
            </div>

            {/* Right Panel: Route Context & Zone Distribution */}
            <div className="hidden xl:block">
              <MapPanel
                selectedGuideId={selectedTimelineGuideId}
                selectedGuideName={selectedGuideInfo?.name}
                routeStops={selectedGuideRouteStops}
                totalDriveMinutes={selectedGuideInfo?.totalDriveMinutes}
                zoneDistribution={zoneDistribution}
                tourRunSummary={tourRunSummary}
                totalGuests={data.totalGuests}
                assignedGuests={assignedGuests}
              />
            </div>
          </div>
        ) : (
          /* ============================================================
           * STANDARD LAYOUT (All Assigned)
           * Full-width timeline - no hopper needed
           * ============================================================ */
          <TimelineContainer
            timelines={timelinesWithPendingChanges}
            startHour={6}
            endHour={20}
            onSegmentClick={handleSegmentClick}
            onGuideClick={handleGuideClick}
            className={isDispatched ? "opacity-75 pointer-events-none" : undefined}
            isAdjustMode={isAdjustMode}
            timelineContentRef={timelineContainerRef}
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

      {/* Mobile Hopper Sheet - FAB and bottom sheet for mobile booking assignment */}
      <MobileHopperSheet
        bookings={filteredHopperBookings}
        guideTimelines={timelinesWithPendingChanges}
        onAssign={(bookingId, guideId, guideName) => {
          toast.success(`Assigned booking to ${guideName}`);
          announce(`Booking assigned to ${guideName}`);
        }}
        isLoading={isLoading}
      />

      {/* Pending Changes Panel - Floating panel in adjust mode */}
      {isAdjustMode && hasPendingChanges && (
        <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] shadow-lg">
          <PendingChangesPanel
            onApply={handleApplyAdjustChanges}
            isApplying={isApplyingChanges}
            guideCapacities={guideCapacities}
          />
        </div>
      )}

      {/* Dispatch Confirmation Dialog */}
      <DispatchConfirmDialog
        open={showDispatchConfirm}
        onOpenChange={setShowDispatchConfirm}
        onConfirm={handleConfirmDispatch}
        isLoading={dispatchMutation.isPending}
        date={date}
        guideCount={timelinesWithPendingChanges.length}
        totalGuests={data?.totalGuests ?? 0}
        efficiencyScore={data?.efficiencyScore ?? 0}
        warningsCount={data?.warnings?.length ?? 0}
      />

      {/* Keyboard Shortcut Hints */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/70 py-1">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[11px] border border-border/50">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[11px] border border-border/50">→</kbd>
          <span className="ml-0.5">days</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[11px] border border-border/50">T</kbd>
          <span className="ml-0.5">today</span>
        </span>
        {isAdjustMode && (
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[11px] border border-border/50">Esc</kbd>
            <span className="ml-0.5">cancel</span>
          </span>
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
 * - GhostPreviewProvider for real-time drag feedback on map
 */
export function CommandCenter(props: CommandCenterProps) {
  return (
    <CommandCenterErrorBoundary>
      <AdjustModeProvider>
        <GhostPreviewProvider>
          <LiveAnnouncerProvider>
            <CommandCenterContent {...props} />
          </LiveAnnouncerProvider>
        </GhostPreviewProvider>
      </AdjustModeProvider>
    </CommandCenterErrorBoundary>
  );
}
