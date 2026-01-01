"use client";

import { useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Route } from "next";

// Components
import { AssignmentLayout } from "@/components/operations/assignment-layout";
import { Button, IconButton } from "@/components/ui/button";
import { AssignmentStatus, getAssignmentStatus } from "@/components/operations/assignment-status";
import { CapacityPill } from "@/components/operations/capacity-bar";
import {
  ChevronLeft,
  Wand2,
  CheckCircle2,
  Bell,
  MoreHorizontal,
  Users,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// Types
import type { BookingCardData } from "@/components/operations/booking-card";
import type { GuideData } from "@/components/operations/guide-row";
import type { TimelineSegmentData } from "@/components/operations/timeline-segment";

export default function TourAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const scheduleId = params.scheduleId as string;

  // Selection state
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

  // Fetch tour assignment data
  const {
    data: assignmentData,
    isLoading,
    error,
    refetch,
  } = trpc.operations.getTourAssignment.useQuery(
    { scheduleId },
    {
      refetchInterval: 15000, // Refetch every 15 seconds
      staleTime: 5000,
    }
  );

  // Mutations
  const assignBooking = trpc.operations.assignBooking.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedBookingId(null);
    },
  });

  const unassignBooking = trpc.operations.unassignBooking.useMutation({
    onSuccess: () => refetch(),
  });

  const autoAssignTour = trpc.operations.autoAssignTour.useMutation({
    onSuccess: () => refetch(),
  });

  const approveTour = trpc.operations.approveTour.useMutation({
    onSuccess: () => refetch(),
  });

  const notifyGuides = trpc.operations.notifyGuides.useMutation({
    onSuccess: () => refetch(),
  });

  // Transform unassigned bookings data
  const bookings = useMemo((): BookingCardData[] => {
    if (!assignmentData?.unassignedBookings) return [];
    return assignmentData.unassignedBookings.map((booking) => ({
      id: booking.id,
      bookingId: booking.id,
      customerName: booking.customerName,
      guestCount: booking.passengerCount,
      zone: booking.zone,
      pickupAddress: booking.pickupAddressName,
      isPrivate: booking.isPrivate,
      assignedGuideId: null, // unassigned bookings don't have a guide
      suggestion: null, // TODO: Add suggestions from service
    }));
  }, [assignmentData?.unassignedBookings]);

  // Transform guide assignments to guides with segments
  const guides = useMemo((): GuideData[] => {
    if (!assignmentData?.guideAssignments) return [];
    return assignmentData.guideAssignments
      .filter((ga) => ga.guide) // Only include assignments with guides
      .map((ga) => {
        const guide = ga.guide!;
        const currentLoad = ga.pickupAssignments.reduce(
          (sum, pa) => sum + pa.passengerCount,
          0
        );

        // Build timeline segments from pickup assignments
        const segments: TimelineSegmentData[] = ga.pickupAssignments.map((pa, idx) => ({
          id: pa.id,
          type: "pickup" as const,
          startTime: pa.estimatedPickupTime || new Date(),
          endTime: pa.estimatedPickupTime
            ? new Date(new Date(pa.estimatedPickupTime).getTime() + 10 * 60 * 1000)
            : new Date(),
          customerName: `${pa.booking.referenceNumber}`,
          guestCount: pa.passengerCount,
          zone: pa.pickupAddress?.zone || null,
          pickupAddress: pa.pickupAddress?.name || null,
          bookingId: pa.bookingId,
        }));

        return {
          id: ga.id, // Use guideAssignmentId as the id for assignment operations
          name: `${guide.firstName} ${guide.lastName}`,
          email: undefined,
          phone: undefined,
          vehicleCapacity: guide.vehicleCapacity || 6,
          vehicleType: guide.vehicleType,
          preferredZones: guide.preferredZones || [],
          currentLoad,
          segments,
        };
      });
  }, [assignmentData?.guideAssignments]);

  // Get selected guide's route context
  const selectedGuideContext = useMemo(() => {
    if (!selectedGuideId) {
      return {
        routePoints: [],
        recommendations: [],
        totalDuration: undefined,
        totalDistance: undefined,
      };
    }

    const guideAssignment = assignmentData?.guideAssignments?.find(
      (ga) => ga.id === selectedGuideId
    );
    if (!guideAssignment) {
      return {
        routePoints: [],
        recommendations: [],
        totalDuration: undefined,
        totalDistance: undefined,
      };
    }

    // Build route points from pickup assignments
    const routePoints = guideAssignment.pickupAssignments.map((pa, idx) => ({
      id: pa.id,
      type: "pickup" as const,
      name: pa.booking.referenceNumber,
      zone: pa.pickupAddress?.zone || null,
      address: pa.pickupAddress?.name || undefined,
      estimatedTime: pa.estimatedPickupTime
        ? format(new Date(pa.estimatedPickupTime), "HH:mm")
        : undefined,
      order: idx + 1,
    }));

    // Generate recommendations
    const recommendations: { type: "info" | "warning" | "suggestion"; message: string }[] = [];
    const guide = guideAssignment.guide;
    const currentLoad = guideAssignment.pickupAssignments.reduce(
      (sum, pa) => sum + pa.passengerCount,
      0
    );

    if (guide && currentLoad >= (guide.vehicleCapacity || 6)) {
      recommendations.push({
        type: "warning",
        message: "Vehicle at full capacity",
      });
    }

    if (guide?.preferredZones && guide.preferredZones.length > 0) {
      const assignedZones = new Set(
        guideAssignment.pickupAssignments
          .filter((pa) => pa.pickupAddress?.zone)
          .map((pa) => pa.pickupAddress!.zone)
      );
      const matchingZones = (guide.preferredZones as string[]).filter((z) =>
        assignedZones.has(z)
      );
      if (matchingZones.length > 0) {
        recommendations.push({
          type: "info",
          message: `Preferred zones: ${matchingZones.join(", ")}`,
        });
      }
    }

    return {
      routePoints,
      recommendations,
      totalDuration: undefined,
      totalDistance: undefined,
    };
  }, [selectedGuideId, assignmentData?.guideAssignments]);

  // Calculate summary stats
  const summary = useMemo(() => {
    if (!assignmentData) {
      return {
        totalBookings: 0,
        assignedBookings: 0,
        totalGuests: 0,
        isApproved: false,
        isNotified: false,
      };
    }

    const assignedBookings = assignmentData.guideAssignments.reduce(
      (sum, ga) => sum + ga.pickupAssignments.length,
      0
    );
    const totalBookings = assignedBookings + assignmentData.unassignedBookings.length;
    const assignedGuests = assignmentData.guideAssignments.reduce(
      (sum, ga) =>
        sum + ga.pickupAssignments.reduce((s, pa) => s + pa.passengerCount, 0),
      0
    );
    const unassignedGuests = assignmentData.unassignedBookings.reduce(
      (sum, b) => sum + b.passengerCount,
      0
    );

    return {
      totalBookings,
      assignedBookings,
      totalGuests: assignedGuests + unassignedGuests,
      isApproved: false, // TODO: Get from schedule
      isNotified: false, // TODO: Get from schedule
    };
  }, [assignmentData]);

  // Assignment status
  const status = useMemo(() => {
    return getAssignmentStatus({
      totalBookings: summary.totalBookings,
      assignedBookings: summary.assignedBookings,
      isApproved: summary.isApproved,
      isNotified: summary.isNotified,
    });
  }, [summary]);

  // Handlers
  const handleAssignToGuide = useCallback(
    (guideAssignmentId: string) => {
      if (selectedBookingId) {
        assignBooking.mutate({
          bookingId: selectedBookingId,
          guideAssignmentId,
          scheduleId,
        });
      }
    },
    [assignBooking, selectedBookingId, scheduleId]
  );

  const handleAutoAssign = useCallback(() => {
    autoAssignTour.mutate({ scheduleId });
  }, [autoAssignTour, scheduleId]);

  const handleApprove = useCallback(() => {
    approveTour.mutate({ scheduleId });
  }, [approveTour, scheduleId]);

  const handleNotify = useCallback(() => {
    notifyGuides.mutate({ scheduleIds: [scheduleId] });
  }, [notifyGuides, scheduleId]);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
          <p className="text-sm font-medium text-destructive">
            Failed to load assignment data
          </p>
          <p className="text-xs text-destructive/70 mt-1">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-xs font-medium text-destructive hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const schedule = assignmentData?.schedule;
  const tourName = schedule?.tour?.name || "Loading...";
  const tourTime = schedule?.startsAt ? format(new Date(schedule.startsAt), "h:mm a") : "";
  const unassignedCount = assignmentData?.unassignedBookings.length || 0;
  const canApprove =
    summary.assignedBookings === summary.totalBookings &&
    summary.totalBookings > 0 &&
    !summary.isApproved;
  const canNotify = summary.isApproved && !summary.isNotified;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background">
        <div className="px-4 sm:px-6 py-3">
          {/* Breadcrumb + Title */}
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={`/org/${slug}/operations` as Route}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Operations</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground truncate">{tourName}</h1>
              <span className="text-sm text-muted-foreground">{tourTime}</span>
              <AssignmentStatus status={status} size="sm" />
            </div>
          </div>

          {/* Stats + Actions */}
          <div className="flex items-center justify-between gap-4">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="font-medium tabular-nums">{summary.totalGuests}</span>
                <span>guests</span>
              </div>
              <CapacityPill current={summary.assignedBookings} max={summary.totalBookings} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {unassignedCount > 0 && (
                <Button
                  size="sm"
                  onClick={handleAutoAssign}
                  disabled={autoAssignTour.isPending}
                  className="hidden sm:flex"
                >
                  {autoAssignTour.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Auto-Assign
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-white/20">
                    {unassignedCount}
                  </span>
                </Button>
              )}

              {canApprove && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApprove}
                  disabled={approveTour.isPending}
                  className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                >
                  {approveTour.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve
                </Button>
              )}

              {canNotify && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNotify}
                  disabled={notifyGuides.isPending}
                  className="border-violet-500/30 text-violet-700 dark:text-violet-400 hover:bg-violet-500/10"
                >
                  {notifyGuides.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  Notify
                </Button>
              )}

              <IconButton variant="ghost" size="sm" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 overflow-hidden">
        <AssignmentLayout
          bookings={bookings}
          guides={guides}
          selectedGuideRoutePoints={selectedGuideContext.routePoints}
          selectedGuideRecommendations={selectedGuideContext.recommendations}
          selectedGuideTotalDuration={selectedGuideContext.totalDuration}
          selectedGuideTotalDistance={selectedGuideContext.totalDistance}
          isLoading={isLoading}
          selectedBookingId={selectedBookingId}
          selectedGuideId={selectedGuideId}
          onSelectBooking={setSelectedBookingId}
          onSelectGuide={(guideId) => {
            setSelectedGuideId(guideId);
            // If a booking is selected, assign it to this guide
            if (selectedBookingId && guideId) {
              handleAssignToGuide(guideId);
            }
          }}
          onAssign={(bookingId, guideAssignmentId) => {
            assignBooking.mutate({
              bookingId,
              guideAssignmentId,
              scheduleId,
            });
          }}
        />
      </div>

      {/* Mobile Auto-Assign FAB */}
      {unassignedCount > 0 && (
        <button
          onClick={handleAutoAssign}
          disabled={autoAssignTour.isPending}
          className={cn(
            "fixed bottom-6 right-6 z-50 lg:hidden",
            "flex items-center gap-2 px-4 py-3 rounded-full",
            "bg-primary text-primary-foreground",
            "shadow-lg shadow-primary/30",
            "hover:scale-105 active:scale-95 transition-transform",
            "disabled:opacity-50"
          )}
        >
          {autoAssignTour.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Wand2 className="h-5 w-5" />
          )}
          <span className="font-semibold">Auto-Assign</span>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white/20">
            {unassignedCount}
          </span>
        </button>
      )}
    </div>
  );
}
