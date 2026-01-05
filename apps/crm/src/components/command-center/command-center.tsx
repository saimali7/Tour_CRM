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
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
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
} from "./adjust-mode";
import { LiveAssignmentProvider } from "./live-assignment-context";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
import { useIsLargeDesktop, useIsDesktop } from "@/hooks/use-media-query";

// Import types and transformers from extracted modules
import type {
  DispatchStatus,
  DispatchWarning,
  DispatchSuggestion,
  DispatchData,
  CommandCenterProps,
} from "./types";
export type { DispatchStatus, DispatchWarning, DispatchSuggestion, DispatchData };

import {
  transformGuideTimeline,
  mapDispatchStatus,
} from "./data-transformers";

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
  const { isAdjustMode, exitAdjustMode, enterAdjustMode } = useAdjustMode();
  const { announce } = useLiveAnnouncer();

  // Responsive breakpoints for conditional rendering (prevents react-resizable-panels sizing issues)
  const isLargeDesktop = useIsLargeDesktop(); // >= 1280px (xl)
  const isDesktop = useIsDesktop(); // >= 1024px (lg)

  // Panel state for guest and guide details
  const [selectedGuest, setSelectedGuest] = useState<GuestCardBooking | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideCardData | null>(null);

  // State for the three-panel layout
  const [selectedTimelineGuideId, setSelectedTimelineGuideId] = useState<string | null>(null);

  // Dispatch confirmation dialog state
  const [showDispatchConfirm, setShowDispatchConfirm] = useState(false);

  // Keyboard shortcuts modal state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Ref for timeline container (used for time calculations in drag/drop)
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Zoom level state: "compact" (4h), "normal" (8h), "expanded" (full day)
  const [zoomLevel, setZoomLevel] = useState<"compact" | "normal" | "expanded">("normal");

  // Calculate timeline hours based on zoom level
  const { startHour, endHour } = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    switch (zoomLevel) {
      case "compact":
        // 4-hour window centered around current time or morning
        const compactStart = Math.max(6, Math.min(currentHour - 1, 18));
        return { startHour: compactStart, endHour: compactStart + 6 };
      case "normal":
        // 10-hour business day view
        return { startHour: 7, endHour: 20 };
      case "expanded":
        // Full day view
        return { startHour: 6, endHour: 24 };
      default:
        return { startHour: 7, endHour: 20 };
    }
  }, [zoomLevel]);

  // Timeline configuration for time-shift calculations
  const timelineConfig = useMemo(() => ({
    startHour,
    endHour,
    snapMinutes: 15,
    guideColumnWidth: 200, // Must match the guideColumnWidth prop in TimelineContainer
  }), [startHour, endHour]);

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
            tourDurationMinutes: run.tour?.durationMinutes,
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

  // Guide timelines from the API (live mode - changes reflect immediately)
  const guideTimelines = useMemo(() => {
    return data?.guideTimelines ?? [];
  }, [data?.guideTimelines]);

  // Get route stops for the selected guide (for map panel)
  const selectedGuideRouteStops = useMemo<RouteStop[]>(() => {
    if (!selectedTimelineGuideId || guideTimelines.length === 0) return [];

    const timeline = guideTimelines.find(
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
  }, [selectedTimelineGuideId, guideTimelines]);

  // Get the selected guide's name and total drive minutes
  const selectedGuideInfo = useMemo(() => {
    if (!selectedTimelineGuideId || guideTimelines.length === 0) return null;

    const timeline = guideTimelines.find(
      (t) => t.guide.id === selectedTimelineGuideId
    );
    if (!timeline) return null;

    return {
      name: `${timeline.guide.firstName} ${timeline.guide.lastName}`.trim(),
      totalDriveMinutes: timeline.totalDriveMinutes,
    };
  }, [selectedTimelineGuideId, guideTimelines]);

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
        case "e":
        case "E":
          if (!isAdjustMode) {
            event.preventDefault();
            enterAdjustMode();
          }
          break;
        case "?":
          event.preventDefault();
          setShowShortcutsModal(true);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdjustMode, exitAdjustMode, enterAdjustMode, onPreviousDay, onNextDay, onToday]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 gap-2">
        {/* Command Strip Skeleton */}
        <Skeleton className="flex-none h-14 w-full rounded-lg" />

        {/* Timeline Skeleton - fills remaining space */}
        <Skeleton className="flex-1 min-h-0 w-full rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full min-h-0 gap-2">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to load dispatch data</p>
              <p className="text-xs text-destructive/70 mt-0.5">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no bookings for this day
  if (!data || data.totalGuests === 0) {
    return (
      <div className="flex flex-col h-full min-h-0 gap-2">
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
          onEnterAdjustMode={enterAdjustMode}
          onExitAdjustMode={() => exitAdjustMode(false)}
          onOptimize={handleOptimize}
          onDispatch={handleDispatch}
        />

        {/* Empty state card - fills remaining space */}
        <div className="flex-1 min-h-0 flex items-center justify-center rounded-lg border border-border bg-card">
          <div className="text-center p-8">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-medium text-foreground mb-1.5">No Tours Scheduled</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No confirmed bookings for this date. Tours appear here once booked.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasWarnings = data.warnings.length > 0;
  const hasUnassigned = hopperBookings.length > 0;
  const isDispatched = data.status === "dispatched";

  // Show three-panel layout ONLY in adjust mode
  // Normal mode focuses on the timeline - hopper appears via the unassigned count button
  const showThreePanelLayout = isAdjustMode;

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
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
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        onEnterAdjustMode={enterAdjustMode}
        onExitAdjustMode={() => exitAdjustMode(false)}
        onOptimize={handleOptimize}
        onDispatch={handleDispatch}
      />

      {/* Warnings Panel - collapsed by default, only in normal mode */}
      {hasWarnings && !isAdjustMode && (
        <WarningsPanel
          warnings={data.warnings}
          onResolve={handleResolveWarning}
          defaultCollapsed={true}
        />
      )}

      {/* Main Content Area - Takes remaining height */}
      <LiveAssignmentProvider date={date} onSuccess={() => refetch()}>
        <DndProvider
          className="flex-1 min-h-0"
          guideTimelines={guideTimelines.map((t) => ({
            guide: t.guide,
            totalGuests: t.totalGuests,
            vehicleCapacity: t.guide.vehicleCapacity,
          }))}
          timelineConfig={timelineConfig}
          timelineContainerRef={timelineContainerRef}
        >
        {showThreePanelLayout ? (
          /* ============================================================
           * THREE-PANEL LAYOUT with Resizable Panels
           * Shown when: adjust mode is active
           * Hopper (left) | Timeline (center) | Map (right)
           * Desktop: 3-panel resizable, Tablet: 2-panel, Mobile: timeline only
           *
           * IMPORTANT: We use conditional rendering (not CSS hiding) to ensure
           * only one ResizablePanelGroup is mounted at a time. This prevents
           * react-resizable-panels from miscalculating panel sizes.
           * ============================================================ */
          <div className="h-full rounded-lg border border-border overflow-hidden">
            {/* Desktop: 3-panel grid layout (xl and above)
                Using CSS Grid instead of react-resizable-panels due to sizing bugs */}
            {isLargeDesktop && (
              <div className="h-full grid grid-cols-[280px_1fr_280px]">
                {/* Left Panel: Hopper - Unassigned Bookings */}
                <div className="flex flex-col min-h-0 overflow-hidden border-r border-border">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <HopperPanel
                      bookings={hopperBookings}
                      onBookingClick={(booking) => {
                        toast.info(`Selected: ${booking.customerName}`);
                      }}
                      isLoading={isLoading}
                      className="h-full"
                    />
                  </div>
                  {/* Pending Changes Panel */}
                  {isAdjustMode && (
                    <PendingChangesPanel
                      onApply={() => {
                        toast.info("Apply pending changes");
                      }}
                      isApplying={false}
                      guideTimelines={guideTimelines.map((t) => ({
                        guideId: t.guide.id,
                        guideName: `${t.guide.firstName} ${t.guide.lastName}`.trim(),
                        segments: t.segments
                          .filter((s) => s.type === "tour" || s.type === "pickup")
                          .map((s) => ({
                            id: s.id,
                            startTime: s.startTime,
                            endTime: s.endTime,
                            type: s.type as "tour" | "pickup",
                          })),
                      }))}
                      className="flex-none border-t border-border"
                    />
                  )}
                </div>

                {/* Center Panel: Guide Dispatch Timeline */}
                <div className="bg-card overflow-hidden">
                  <TimelineContainer
                    timelines={guideTimelines}
                    startHour={startHour}
                    endHour={endHour}
                    onSegmentClick={handleSegmentClick}
                    onGuideClick={handleTimelineGuideClick}
                    className={cn(
                      "h-full min-h-0",
                      isDispatched && "opacity-75 pointer-events-none"
                    )}
                    isAdjustMode={isAdjustMode}
                    timelineContentRef={timelineContainerRef}
                  />
                </div>

                {/* Right Panel: Route Context & Zone Distribution */}
                <div className="overflow-hidden border-l border-border">
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
            )}

            {/* Tablet: 2-panel grid layout - lg to xl (1024px - 1279px) */}
            {isDesktop && !isLargeDesktop && (
              <div className="h-full grid grid-cols-[280px_1fr]">
                <div className="flex flex-col overflow-hidden border-r border-border">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <HopperPanel
                      bookings={hopperBookings}
                      onBookingClick={(booking) => {
                        toast.info(`Selected: ${booking.customerName}`);
                      }}
                      isLoading={isLoading}
                      className="h-full"
                    />
                  </div>
                  {isAdjustMode && (
                    <PendingChangesPanel
                      onApply={() => toast.info("Apply pending changes")}
                      isApplying={false}
                      guideTimelines={guideTimelines.map((t) => ({
                        guideId: t.guide.id,
                        guideName: `${t.guide.firstName} ${t.guide.lastName}`.trim(),
                        segments: t.segments
                          .filter((s) => s.type === "tour" || s.type === "pickup")
                          .map((s) => ({
                            id: s.id,
                            startTime: s.startTime,
                            endTime: s.endTime,
                            type: s.type as "tour" | "pickup",
                          })),
                      }))}
                      className="flex-none border-t border-border"
                    />
                  )}
                </div>

                <div className="bg-card overflow-hidden">
                  <TimelineContainer
                    timelines={guideTimelines}
                    startHour={startHour}
                    endHour={endHour}
                    onSegmentClick={handleSegmentClick}
                    onGuideClick={handleTimelineGuideClick}
                    className={cn(
                      "h-full min-h-0",
                      isDispatched && "opacity-75 pointer-events-none"
                    )}
                    isAdjustMode={isAdjustMode}
                    timelineContentRef={timelineContainerRef}
                  />
                </div>
              </div>
            )}

            {/* Mobile: Timeline only (below lg) */}
            {!isDesktop && (
              <div className="h-full bg-card">
                <TimelineContainer
                  timelines={guideTimelines}
                  startHour={startHour}
                  endHour={endHour}
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
            )}
          </div>
        ) : (
          /* ============================================================
           * STANDARD LAYOUT (Normal viewing mode)
           * Timeline takes center stage - clean and focused
           * Enter edit mode to see hopper and context panels
           * ============================================================ */
          <div className="h-full rounded-lg border border-border bg-card overflow-hidden">
            <TimelineContainer
              timelines={guideTimelines}
              startHour={startHour}
              endHour={endHour}
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
        )}
        </DndProvider>
      </LiveAssignmentProvider>

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
        bookings={hopperBookings}
        guideTimelines={guideTimelines}
        onAssign={(bookingId, guideId, guideName) => {
          toast.success(`Assigned booking to ${guideName}`);
          announce(`Booking assigned to ${guideName}`);
        }}
        isLoading={isLoading}
      />

      {/* Dispatch Confirmation Dialog */}
      <DispatchConfirmDialog
        open={showDispatchConfirm}
        onOpenChange={setShowDispatchConfirm}
        onConfirm={handleConfirmDispatch}
        isLoading={dispatchMutation.isPending}
        date={date}
        guideCount={guideTimelines.length}
        totalGuests={data?.totalGuests ?? 0}
        efficiencyScore={data?.efficiencyScore ?? 0}
        warningsCount={data?.warnings?.length ?? 0}
      />

      {/* Keyboard Shortcut Hints - fixed at bottom, doesn't affect scroll */}
      <div className="flex-none flex items-center justify-center gap-3 text-xs text-muted-foreground/70 py-1">
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
            <span className="ml-0.5">exit</span>
          </span>
        )}
        <button
          onClick={() => setShowShortcutsModal(true)}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded",
            "hover:bg-muted/70 hover:text-foreground transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          )}
          aria-label="Show keyboard shortcuts"
        >
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[11px] border border-border/50">?</kbd>
          <span className="ml-0.5">shortcuts</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={showShortcutsModal}
        onOpenChange={setShowShortcutsModal}
      />
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
