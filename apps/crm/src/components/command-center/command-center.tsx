"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { CommandStrip } from "./command-strip";
import { WarningsPanel } from "./warnings-panel";
import { SimpleTimelineContainer } from "./simple-timeline";
import { GuestCard, type GuestCardBooking } from "./guest-card";
import { GuideCard, type GuideCardData } from "./guide-card";
import { type HopperBooking, MobileHopperSheet } from "./hopper";
import { LiveAnnouncerProvider, useLiveAnnouncer } from "./live-announcer";
import { DispatchConfirmDialog } from "./dispatch-confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Calendar, CheckCircle2, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { GuideTimeline, GuideInfo } from "./timeline/types";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";

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
  transformWarnings,
} from "./data-transformers";

/**
 * Main command center component
 * Uses the simplified booking-centric timeline that's always in edit mode
 */
function CommandCenterContent({
  date,
  onDateChange,
  onPreviousDay,
  onNextDay,
  onToday,
}: CommandCenterProps) {
  const { announce } = useLiveAnnouncer();

  // Panel state for guest and guide details
  const [selectedGuest, setSelectedGuest] = useState<GuestCardBooking | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideCardData | null>(null);

  // Dispatch confirmation dialog state
  const [showDispatchConfirm, setShowDispatchConfirm] = useState(false);

  // Keyboard shortcuts modal state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Get tRPC utils for query invalidation
  const utils = trpc.useUtils();

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  // Convert date to YYYY-MM-DD string for API calls
  const dateString = format(date, "yyyy-MM-dd");

  // Fetch dispatch data for the selected date
  const {
    data: dispatchResponse,
    isLoading,
    error,
    refetch,
  } = trpc.commandCenter.getDispatch.useQuery(
    { date: dateString },
    {
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000,
    }
  );

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  // Optimize mutation
  const optimizeMutation = trpc.commandCenter.optimize.useMutation({
    onSuccess: (result) => {
      utils.commandCenter.getDispatch.invalidate({ date: dateString });

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
      utils.commandCenter.getDispatch.invalidate({ date: dateString });

      toast.success("Dispatch sent successfully", {
        description: `${result.guidesNotified.length} guides notified`,
      });

      announce(`Dispatch sent. ${result.guidesNotified.length} guides notified.`, "assertive");
    },
    onError: (error) => {
      toast.error("Dispatch failed", {
        description: error.message,
      });

      announce(`Dispatch failed: ${error.message}`, "assertive");
    },
  });

  // Resolve warning mutation
  const resolveWarningMutation = trpc.commandCenter.resolveWarning.useMutation({
    onSuccess: () => {
      utils.commandCenter.getDispatch.invalidate({ date: dateString });
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
    optimizeMutation.mutate({ date: dateString });
  }, [dateString, optimizeMutation]);

  const handleDispatch = useCallback(() => {
    setShowDispatchConfirm(true);
  }, []);

  const handleConfirmDispatch = useCallback(() => {
    dispatchMutation.mutate({ date: dateString });
    setShowDispatchConfirm(false);
  }, [dateString, dispatchMutation]);

  // Handle guide click - opens the guide detail card
  const handleGuideClick = useCallback((guide: GuideInfo) => {
    if (!dispatchResponse) return;

    const timelines = dispatchResponse.timelines.map(transformGuideTimeline);
    const timeline = timelines.find(t => t.guide.id === guide.id);

    if (!timeline) {
      setSelectedGuide(null);
      return;
    }

    // Build assignments from timeline segments
    type AssignmentBooking = {
      id: string;
      referenceNumber: string;
      customerName: string;
      customerEmail?: string | null;
      customerPhone?: string | null;
      guestCount: number;
      adultCount: number;
      childCount?: number | null;
      infantCount?: number | null;
      pickupLocation?: string | null;
      pickupTime?: string | null;
      pickupZoneName?: string | null;
      pickupZoneColor?: string | null;
      isFirstTime?: boolean;
      specialOccasion?: string | null;
      accessibilityNeeds?: string | null;
      dietaryRequirements?: string | null;
      specialRequests?: string | null;
    };

    type GuideAssignment = {
      tourRunId: string;
      tourName: string;
      startTime: string;
      endTime: string;
      guestCount: number;
      pickupCount: number;
      bookings: AssignmentBooking[];
    };

    const assignments: GuideAssignment[] = [];
    let currentPickups: AssignmentBooking[] = [];

    for (const segment of timeline.segments) {
      if (segment.type === "pickup" && segment.booking) {
        const booking = segment.booking;
        const customer = booking.customer;
        currentPickups.push({
          id: booking.id,
          referenceNumber: booking.referenceNumber,
          customerName: customer
            ? `${customer.firstName} ${customer.lastName}`.trim()
            : "Guest",
          customerEmail: customer?.email,
          customerPhone: customer?.phone,
          guestCount: booking.totalParticipants,
          adultCount: booking.adultCount,
          childCount: booking.childCount,
          pickupLocation: segment.pickupLocation,
          pickupTime: segment.startTime,
          pickupZoneName: segment.pickupZoneName,
          pickupZoneColor: segment.pickupZoneColor,
          isFirstTime: segment.isFirstTimer,
          specialOccasion: booking.specialOccasion,
          specialRequests: booking.specialRequests,
        });
      } else if (segment.type === "tour" && segment.tour) {
        const totalGuests = currentPickups.reduce((sum, b) => sum + b.guestCount, 0);
        assignments.push({
          tourRunId: segment.scheduleId || segment.id,
          tourName: segment.tour.name,
          startTime: segment.startTime,
          endTime: segment.endTime,
          guestCount: segment.totalGuests ?? totalGuests,
          pickupCount: currentPickups.length,
          bookings: [...currentPickups],
        });
        currentPickups = [];
      }
    }

    const guideData: GuideCardData = {
      id: guide.id,
      name: `${guide.firstName} ${guide.lastName}`.trim(),
      email: guide.email,
      phone: guide.phone,
      avatarUrl: guide.avatarUrl,
      vehicleCapacity: guide.vehicleCapacity ?? 6,
      status: assignments.length > 0 ? "assigned" : "available",
      totalAssignments: assignments.length,
      totalGuests: timeline.totalGuests ?? 0,
      totalDriveMinutes: timeline.totalDriveMinutes ?? 0,
      assignments,
    };
    setSelectedGuide(guideData);
  }, [dispatchResponse]);

  // ==========================================================================
  // TRANSFORM DATA
  // ==========================================================================

  const data = useMemo<DispatchData | null>(() => {
    if (!dispatchResponse) return null;

    const { status, tourRuns, timelines } = dispatchResponse;

    const serviceWarnings = status.warnings ?? [];
    const fallbackWarnings: DispatchWarning[] = [];

    if (serviceWarnings.length === 0 && tourRuns) {
      for (const run of tourRuns) {
        if (run.status === "unassigned") {
          fallbackWarnings.push({
            id: `warning_${run.key}_unassigned`,
            type: "no_guide",
            message: `${run.tour?.name || "Tour"} at ${run.time} has no guide assigned (${run.totalGuests} ${run.totalGuests === 1 ? "guest" : "guests"})`,
            tourRunKey: run.key,
            suggestions: [],
          });
        } else if (run.status === "partial") {
          fallbackWarnings.push({
            id: `warning_${run.key}_partial`,
            type: "capacity",
            message: `${run.tour?.name || "Tour"} at ${run.time} needs ${run.guidesNeeded - run.guidesAssigned} more guide(s)`,
            guestCount: run.totalGuests,
            tourRunKey: run.key,
            suggestions: [],
          });
        } else if (run.status === "overstaffed") {
          fallbackWarnings.push({
            id: `warning_${run.key}_overstaffed`,
            type: "conflict",
            message: `${run.tour?.name || "Tour"} at ${run.time} has too many guides assigned`,
            tourRunKey: run.key,
            suggestions: [],
          });
        }
      }
    }

    const warnings = serviceWarnings.length > 0
      ? transformWarnings(serviceWarnings)
      : fallbackWarnings;

    const guideTimelines = timelines.map(transformGuideTimeline);
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

  const availableGuides = useMemo(() => {
    if (!dispatchResponse?.timelines) return [];

    return dispatchResponse.timelines.map((timeline) => ({
      id: timeline.guide.id,
      name: `${timeline.guide.firstName} ${timeline.guide.lastName}`.trim(),
      vehicleCapacity: timeline.vehicleCapacity ?? 0,
      currentGuests: timeline.totalGuests ?? 0,
    }));
  }, [dispatchResponse?.timelines]);

  const handleResolveWarning = useCallback(
    (warningId: string, suggestionId: string) => {
      let type: "assign_guide" | "add_external" | "skip" | "cancel" = "skip";
      let guideId: string | undefined;

      const warning = data?.warnings.find((item) => item.id === warningId);
      const suggestion = warning?.suggestions.find((item) => item.id === suggestionId);
      const assignPrefixes = ["res_assign_", "assign_", "quick_assign_"];

      for (const prefix of assignPrefixes) {
        if (suggestionId.startsWith(prefix)) {
          type = "assign_guide";
          guideId = suggestionId.replace(prefix, "");
          break;
        }
      }

      if (!guideId && suggestion?.guideId) {
        type = "assign_guide";
        guideId = suggestion.guideId;
      } else if (suggestion?.action === "add_external" || suggestionId === "res_add_external" || suggestionId === "add_external") {
        type = "add_external";
      } else if (suggestionId === "res_acknowledge" || suggestion?.action === "acknowledge") {
        type = "skip";
      }

      resolveWarningMutation.mutate({
        date: dateString,
        warningId,
        resolution: {
          id: suggestionId,
          type,
          guideId,
          bookingId: warning?.bookingId,
          tourRunKey: warning?.tourRunKey,
        },
      });
    },
    [dateString, resolveWarningMutation, data?.warnings]
  );

  // Extract unassigned bookings for mobile hopper
  const hopperBookings = useMemo<HopperBooking[]>(() => {
    if (!dispatchResponse?.tourRuns) return [];

    const unassigned: HopperBooking[] = [];

    for (const run of dispatchResponse.tourRuns) {
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
            experienceMode: booking.experienceMode ?? undefined,
            isVIP: false,
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

  const guideTimelines = useMemo(() => {
    return data?.guideTimelines ?? [];
  }, [data?.guideTimelines]);

  // Format date for display
  const formattedDate = useMemo(() => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEE, MMM d");
  }, [date]);

  // ==========================================================================
  // KEYBOARD SHORTCUTS
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key) {
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
        case "?":
          event.preventDefault();
          setShowShortcutsModal(true);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPreviousDay, onNextDay, onToday]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 gap-2">
        <Skeleton className="flex-none h-14 w-full rounded-lg" />
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
          onOptimize={handleOptimize}
          onDispatch={handleDispatch}
        />

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
  const isDispatched = data.status === "dispatched";

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
        onOptimize={handleOptimize}
        onDispatch={handleDispatch}
      />

      {data.status === "ready" && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <div>
            <span className="font-medium">Ready to dispatch.</span>{" "}
            <span className="text-emerald-700/80 dark:text-emerald-300/80">
              All assignments are clear and warnings are resolved.
            </span>
          </div>
        </div>
      )}

      {data.status === "dispatched" && (
        <div className="rounded-lg border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
          <Lock className="h-4 w-4" />
          <div>
            <span className="font-medium text-foreground/90">Dispatched.</span>{" "}
            {data.dispatchedAt
              ? `Sent ${format(data.dispatchedAt, "MMM d, HH:mm")}.`
              : "Dispatch sent."}{" "}
            This day is locked for edits.
          </div>
        </div>
      )}

      {/* Warnings Panel - collapsed by default */}
      {hasWarnings && (
        <WarningsPanel
          warnings={data.warnings}
          onResolve={handleResolveWarning}
          availableGuides={availableGuides}
          defaultCollapsed={true}
        />
      )}

      {/* Main Timeline - Always uses the new simplified booking-centric timeline */}
      <div className="flex-1 min-h-0 rounded-lg border border-border bg-card overflow-hidden">
        <SimpleTimelineContainer
          date={date}
          tourRuns={dispatchResponse?.tourRuns ?? []}
          guideTimelines={dispatchResponse?.timelines ?? []}
          isLoading={isLoading}
          isReadOnly={isDispatched}
          onGuideClick={(guide) => {
            const guideInfo: GuideInfo = {
              id: guide.id,
              firstName: guide.firstName,
              lastName: guide.lastName,
              email: guide.email,
              phone: guide.phone,
              avatarUrl: guide.avatarUrl,
              vehicleCapacity: guide.vehicleCapacity,
              status: guide.status,
            };
            handleGuideClick(guideInfo);
          }}
          className={cn(
            "h-full",
            isDispatched && "opacity-75"
          )}
        />
      </div>

      {/* Guest Details Panel */}
      <GuestCard
        open={!!selectedGuest}
        onClose={() => setSelectedGuest(null)}
        booking={selectedGuest}
        onViewBooking={(bookingId) => {
          toast.info("View booking feature coming soon");
        }}
      />

      {/* Guide Details Panel */}
      <GuideCard
        open={!!selectedGuide}
        onClose={() => setSelectedGuide(null)}
        guide={selectedGuide}
        onViewProfile={(guideId) => {
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
        isReadOnly={isDispatched}
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

      {/* Keyboard Shortcut Hints */}
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
 * Command Center with Error Boundary support
 * The timeline is always in edit mode - no need for adjust mode toggle
 */
export function CommandCenter(props: CommandCenterProps) {
  return (
    <CommandCenterErrorBoundary>
      <LiveAnnouncerProvider>
        <CommandCenterContent {...props} />
      </LiveAnnouncerProvider>
    </CommandCenterErrorBoundary>
  );
}
