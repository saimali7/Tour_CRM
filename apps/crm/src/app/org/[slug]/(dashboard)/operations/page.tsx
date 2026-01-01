"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { format, startOfDay } from "date-fns";
import type { Route } from "next";

// Components
import { DayHeader } from "@/components/operations/day-header";
import { DayStats } from "@/components/operations/day-stats";
import { TourList, type TourItem } from "@/components/operations/tour-list";
import { BulkActionsBar, AutoAssignFAB } from "@/components/operations/bulk-actions-bar";

export default function OperationsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Selected date state
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));

  // Fetch day overview data
  const {
    data: dayOverview,
    isLoading,
    error,
    refetch,
  } = trpc.operations.getDayOverview.useQuery(
    { date: selectedDate },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 10000,
    }
  );

  // Mutations
  const autoAssignDay = trpc.operations.autoAssignDay.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const approveAllReady = trpc.operations.approveAllReady.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const notifyAllGuides = trpc.operations.notifyAllGuides.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Transform tours data for the list
  const tours = useMemo((): TourItem[] => {
    if (!dayOverview?.tours) return [];
    return dayOverview.tours.map((tour) => {
      const assignedCount = tour.bookingCount - tour.unassignedBookings;
      return {
        scheduleId: tour.scheduleId,
        tourName: tour.tourName,
        startsAt: tour.startsAt,
        guestCount: tour.guestCount,
        bookingCount: tour.bookingCount,
        assignedCount,
        guidesAssigned: tour.guidesAssigned,
        guidesNeeded: tour.guidesNeeded,
        isApproved: tour.status === "approved" || tour.status === "notified",
        isNotified: tour.status === "notified",
      };
    });
  }, [dayOverview?.tours]);

  // Calculate stats from dayOverview.stats
  const stats = useMemo(() => {
    if (!dayOverview?.stats) {
      return { tours: 0, guests: 0, guides: 0, needsAttention: 0 };
    }
    return {
      tours: dayOverview.stats.totalTours,
      guests: dayOverview.stats.totalGuests,
      guides: dayOverview.stats.totalGuides,
      needsAttention: dayOverview.stats.needsAttention,
    };
  }, [dayOverview?.stats]);

  // Bulk action counts
  const bulkCounts = useMemo(() => {
    const toursNeedingAssignment = tours.filter((t) => t.assignedCount < t.bookingCount).length;
    const readyToApprove = tours.filter(
      (t) => t.assignedCount >= t.bookingCount && t.bookingCount > 0 && !t.isApproved
    ).length;
    const readyToNotify = tours.filter((t) => t.isApproved && !t.isNotified).length;
    return { toursNeedingAssignment, readyToApprove, readyToNotify };
  }, [tours]);

  // Handlers
  const handleAutoAssignAll = useCallback(() => {
    autoAssignDay.mutate({ date: selectedDate });
  }, [autoAssignDay, selectedDate]);

  const handleApproveAll = useCallback(() => {
    approveAllReady.mutate({ date: selectedDate });
  }, [approveAllReady, selectedDate]);

  const handleNotifyAll = useCallback(() => {
    notifyAllGuides.mutate({ date: selectedDate });
  }, [notifyAllGuides, selectedDate]);

  const handlePrintManifests = useCallback(() => {
    // Navigate to print manifests page with date
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    router.push(`/org/${slug}/schedules/print-manifests?date=${dateStr}` as Route);
  }, [router, selectedDate, slug]);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
          <p className="text-sm font-medium text-destructive">Failed to load operations data</p>
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

  return (
    <div className="min-h-screen pb-24">
      {/* Page Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 sm:px-6 py-4 space-y-4">
          {/* Title and Date Navigation */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">
                Tour Command Center
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage guide assignments and pickups
              </p>
            </div>
          </div>

          <DayHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />

          {/* Stats Row */}
          <DayStats
            tours={stats.tours}
            guests={stats.guests}
            guides={stats.guides}
            needsAttention={stats.needsAttention}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-6">
        <TourList tours={tours} orgSlug={slug} isLoading={isLoading} />
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        toursNeedingAssignment={bulkCounts.toursNeedingAssignment}
        readyToApprove={bulkCounts.readyToApprove}
        readyToNotify={bulkCounts.readyToNotify}
        isAutoAssigning={autoAssignDay.isPending}
        isApproving={approveAllReady.isPending}
        isNotifying={notifyAllGuides.isPending}
        onAutoAssignAll={handleAutoAssignAll}
        onApproveAll={handleApproveAll}
        onNotifyAll={handleNotifyAll}
        onPrintManifests={handlePrintManifests}
      />

      {/* Mobile FAB */}
      <AutoAssignFAB
        count={bulkCounts.toursNeedingAssignment}
        onClick={handleAutoAssignAll}
        isLoading={autoAssignDay.isPending}
      />
    </div>
  );
}
