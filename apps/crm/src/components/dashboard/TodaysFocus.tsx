"use client";

import { useState, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  FileText,
  UserPlus,
  Loader2,
  ChevronRight,
  ChevronDown,
  Phone,
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

  // Track which tour runs are expanded (collapsed by default)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedRuns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Fetch today's actual bookings
  const { data: todayBookings, isLoading } =
    trpc.dashboard.getTodayBookings.useQuery(undefined, {
      refetchInterval: 30000,
    });

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
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Today&apos;s Tours
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  const hasBookings = todayBookings && todayBookings.length > 0;

  return (
    <section className="space-y-3">
      {/* Compact Header - stats are now in MetricsBar at dashboard level */}
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Today&apos;s Tours
        </h2>
        {hasBookings && (
          <span className="text-xs text-muted-foreground">
            {groupedBookings.length} tour{groupedBookings.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Empty State - Compressed following design principles */}
      {!hasBookings && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border bg-muted/30">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No bookings for today</span>
        </div>
      )}

      {/* Grouped by Tour Run - Compact spacing */}
      {hasBookings && groupedBookings.length > 0 && (
        <div className="space-y-3">
          {groupedBookings.map((group) => {
            const needsGuide = group.guidesAssigned < group.guidesRequired;
            const utilization = group.capacity > 0
              ? (group.totalGuests / group.capacity) * 100
              : 0;

            const runKey = `${group.tourId}-${group.time}`;
            const isExpanded = expandedRuns.has(runKey);

            return (
              <div
                key={runKey}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Tour Run Header - Clickable to expand/collapse */}
                <button
                  onClick={() => toggleExpanded(runKey)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                    needsGuide ? "bg-destructive/5" : "bg-muted/30",
                    "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Expand/Collapse indicator */}
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      !isExpanded && "-rotate-90"
                    )} />

                    {/* Time */}
                    <div className="text-center">
                      <p className="text-base font-bold text-foreground font-mono">{group.time}</p>
                    </div>

                    {/* Tour Name + Capacity */}
                    <div>
                      <span className="font-semibold text-foreground">
                        {group.tourName}
                      </span>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-sm text-muted-foreground">
                          {group.totalGuests}/{group.capacity} guests
                        </span>
                        <span className="text-sm text-muted-foreground">
                          · {group.bookings.length} booking{group.bookings.length !== 1 ? "s" : ""}
                        </span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
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

                  {/* Guide Status */}
                  <div className="flex items-center gap-2">
                    {needsGuide ? (
                      <span className="text-sm font-medium text-destructive">
                        Needs guide
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {group.guidesAssigned} guide{group.guidesAssigned !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded Content - Actions + Bookings */}
                {isExpanded && (
                  <>
                    {/* Action buttons row */}
                    <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-muted/20">
                      {needsGuide && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
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
                      )}
                      <Link
                        href={`/org/${orgSlug}/tour-run?tourId=${group.tourId}&date=${new Date().toISOString().split("T")[0]}&time=${format(group.startsAt, "HH:mm")}` as Route}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText className="h-4 w-4" />
                        Manifest
                      </Link>
                    </div>

                    {/* Bookings List */}
                    <div className="divide-y divide-border border-t border-border">
                      {group.bookings.map((booking) => (
                        <BookingRow
                          key={booking.bookingId}
                          booking={booking}
                          orgSlug={orgSlug}
                        />
                      ))}
                    </div>
                  </>
                )}
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
