"use client";

import { useState, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  UserPlus,
  Loader2,
  Clock,
  ChevronRight,
  CreditCard,
  AlertTriangle,
  Phone,
  Mail,
  DollarSign,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { QuickGuideAssignSheet } from "@/components/scheduling/quick-guide-assign-sheet";
import { Badge } from "@/components/ui/badge";

interface TodaysFocusProps {
  orgSlug: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TodaysFocus({ orgSlug }: TodaysFocusProps) {
  const [assignState, setAssignState] = useState<{
    isOpen: boolean;
    tourRun: {
      tourId: string;
      tourName: string;
      date: Date;
      time: string;
      bookingId?: string;
    };
  } | null>(null);

  // Fetch today's tour runs (grouped by tour + time)
  const { data: tourRunData, isLoading: tourRunsLoading } = trpc.tourRun.getToday.useQuery();

  // Fetch today's actual bookings
  const { data: todayBookings, isLoading: bookingsLoading } =
    trpc.dashboard.getTodayBookings.useQuery(undefined, {
      refetchInterval: 30000,
    });

  const isLoading = tourRunsLoading || bookingsLoading;

  // Calculate actions needed
  const actionsNeeded = useMemo(() => {
    if (!todayBookings || !tourRunData) return { guides: 0, unpaid: 0, pending: 0, total: 0 };

    const tourRuns = tourRunData.tourRuns || [];
    const guidesNeeded = tourRuns.filter(r => r.guidesAssigned < r.guidesRequired).length;
    const unpaidBookings = todayBookings.filter(b => b.paymentStatus !== "paid").length;
    const pendingBookings = todayBookings.filter(b => b.status === "pending").length;

    return {
      guides: guidesNeeded,
      unpaid: unpaidBookings,
      pending: pendingBookings,
      total: guidesNeeded + unpaidBookings + pendingBookings,
    };
  }, [todayBookings, tourRunData]);

  // Group bookings by tour run (tour + time)
  const groupedBookings = useMemo(() => {
    if (!todayBookings) return [];

    const groups = new Map<string, {
      tourId: string;
      tourName: string;
      time: string;
      startsAt: Date;
      bookings: typeof todayBookings;
      totalGuests: number;
      capacity: number;
      guidesAssigned: number;
      guidesRequired: number;
    }>();

    todayBookings.forEach((booking) => {
      const key = `${booking.tour.id}-${format(new Date(booking.schedule.startsAt), "HH:mm")}`;

      if (!groups.has(key)) {
        groups.set(key, {
          tourId: booking.tour.id,
          tourName: booking.tour.name,
          time: format(new Date(booking.schedule.startsAt), "h:mm a"),
          startsAt: new Date(booking.schedule.startsAt),
          bookings: [],
          totalGuests: 0,
          capacity: booking.schedule.maxParticipants || 0,
          guidesAssigned: booking.schedule.guidesAssigned || 0,
          guidesRequired: booking.schedule.guidesRequired || 1,
        });
      }

      const group = groups.get(key)!;
      group.bookings.push(booking);
      group.totalGuests += booking.participants;
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.startsAt.getTime() - b.startsAt.getTime()
    );
  }, [todayBookings]);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Today&apos;s Focus
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  const hasBookings = todayBookings && todayBookings.length > 0;
  const totalGuests = todayBookings?.reduce((sum, b) => sum + b.participants, 0) || 0;
  const totalRevenue = todayBookings?.reduce((sum, b) => sum + parseFloat(b.total || "0"), 0) || 0;

  return (
    <section className="space-y-4">
      {/* Header with Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Today&apos;s Focus
          </h2>
          {hasBookings && (
            <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
              <span><span className="font-semibold text-foreground">{todayBookings?.length}</span> bookings</span>
              <span><span className="font-semibold text-foreground">{totalGuests}</span> guests</span>
              <span className="text-primary font-semibold">${totalRevenue.toFixed(0)}</span>
            </div>
          )}
        </div>
        {actionsNeeded.total > 0 && (
          <Badge variant="warning" className="gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            {actionsNeeded.total} action{actionsNeeded.total !== 1 ? "s" : ""} needed
          </Badge>
        )}
      </div>

      {/* Actions Needed Bar */}
      {actionsNeeded.total > 0 && (
        <div className="flex flex-wrap gap-2">
          {actionsNeeded.guides > 0 && (
            <Link
              href={`/org/${orgSlug}/guides` as Route}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              {actionsNeeded.guides} tour{actionsNeeded.guides !== 1 ? "s" : ""} need guide
            </Link>
          )}
          {actionsNeeded.unpaid > 0 && (
            <Link
              href={`/org/${orgSlug}/bookings?view=needs-action` as Route}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              {actionsNeeded.unpaid} unpaid
            </Link>
          )}
          {actionsNeeded.pending > 0 && (
            <Link
              href={`/org/${orgSlug}/bookings?view=needs-action` as Route}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              <AlertCircle className="h-4 w-4" />
              {actionsNeeded.pending} pending confirmation
            </Link>
          )}
        </div>
      )}

      {/* Empty State */}
      {!hasBookings && (
        <div className="text-center py-12 rounded-xl border border-dashed border-border bg-muted/20">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">
            No bookings for today
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Bookings will appear here when customers book tours.
          </p>
        </div>
      )}

      {/* Grouped by Tour Run */}
      {hasBookings && groupedBookings.length > 0 && (
        <div className="space-y-4">
          {groupedBookings.map((group) => {
            const needsGuide = group.guidesAssigned < group.guidesRequired;
            const utilization = group.capacity > 0
              ? (group.totalGuests / group.capacity) * 100
              : 0;

            return (
              <div
                key={`${group.tourId}-${group.time}`}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Tour Run Header */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-3 border-b",
                  needsGuide ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-border"
                )}>
                  <div className="flex items-center gap-4">
                    {/* Time */}
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground font-mono">{group.time}</p>
                    </div>

                    {/* Tour Name + Capacity */}
                    <div>
                      <Link
                        href={`/org/${orgSlug}/tours/${group.tourId}` as Route}
                        className="font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {group.tourName}
                      </Link>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {group.totalGuests}/{group.capacity} guests
                        </span>
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              utilization >= 80 ? "bg-emerald-500" :
                              utilization >= 50 ? "bg-primary" :
                              utilization >= 20 ? "bg-amber-500" : "bg-red-400"
                            )}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Guide Status + Actions */}
                  <div className="flex items-center gap-3">
                    {needsGuide ? (
                      <button
                        onClick={() => {
                          const firstBooking = group.bookings[0];
                          if (firstBooking) {
                            setAssignState({
                              isOpen: true,
                              tourRun: {
                                tourId: group.tourId,
                                tourName: group.tourName,
                                date: new Date(),
                                time: group.time,
                                bookingId: firstBooking.bookingId,
                              },
                            });
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <UserPlus className="h-4 w-4" />
                        Assign Guide
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        {group.guidesAssigned} guide{group.guidesAssigned !== 1 ? "s" : ""}
                      </span>
                    )}
                    <Link
                      href={`/org/${orgSlug}/tour-run?tourId=${group.tourId}&date=${new Date().toISOString().split("T")[0]}&time=${format(group.startsAt, "HH:mm")}` as Route}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      Manifest
                    </Link>
                  </div>
                </div>

                {/* Bookings List */}
                <div className="divide-y divide-border">
                  {group.bookings.map((booking) => (
                    <BookingRow
                      key={booking.bookingId}
                      booking={booking}
                      orgSlug={orgSlug}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Guide Assign Sheet */}
      {assignState && assignState.tourRun.bookingId && (
        <QuickGuideAssignSheet
          open={assignState.isOpen}
          onOpenChange={(open) => !open && setAssignState(null)}
          bookingId={assignState.tourRun.bookingId}
          scheduleInfo={{
            id: `${assignState.tourRun.tourId}-${assignState.tourRun.time}`,
            tourName: assignState.tourRun.tourName,
            date: assignState.tourRun.date.toISOString().split("T")[0]!,
            time: assignState.tourRun.time,
          }}
          onSuccess={() => setAssignState(null)}
        />
      )}
    </section>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface BookingRowProps {
  booking: {
    bookingId: string;
    referenceNumber: string;
    status: string;
    paymentStatus: string;
    participants: number;
    total: string;
    customer: {
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
    tour: {
      id: string;
      name: string;
    };
    schedule: {
      id: string;
      startsAt: Date | string;
    };
  };
  orgSlug: string;
}

function BookingRow({ booking, orgSlug }: BookingRowProps) {
  const isConfirmed = booking.status === "confirmed";
  const isPaid = booking.paymentStatus === "paid";
  const isReady = isConfirmed && isPaid;

  return (
    <Link
      href={`/org/${orgSlug}/bookings/${booking.bookingId}` as Route}
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
    >
      {/* Status Indicator */}
      <div className={cn(
        "h-2 w-2 rounded-full flex-shrink-0",
        isReady ? "bg-emerald-500" : isPaid ? "bg-amber-500" : "bg-red-400"
      )} />

      {/* Customer Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {booking.customer.firstName} {booking.customer.lastName}
          </p>
          <span className="text-xs text-muted-foreground font-mono">
            #{booking.referenceNumber}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {booking.participants} guest{booking.participants !== 1 ? "s" : ""}
          </span>
          {booking.customer.phone && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {booking.customer.phone}
            </span>
          )}
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn(
          "text-sm font-medium tabular-nums",
          isPaid ? "text-foreground" : "text-amber-600 dark:text-amber-400"
        )}>
          ${parseFloat(booking.total).toFixed(0)}
        </span>
        {isReady ? (
          <Badge variant="success" className="text-xs">Ready</Badge>
        ) : !isConfirmed ? (
          <Badge variant="warning" className="text-xs">Pending</Badge>
        ) : !isPaid ? (
          <Badge variant="warning" className="text-xs">Unpaid</Badge>
        ) : null}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

export default TodaysFocus;
