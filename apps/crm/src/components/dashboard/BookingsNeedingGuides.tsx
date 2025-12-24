"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertTriangle,
  Clock,
  Users,
  ChevronRight,
  UserPlus,
  Loader2,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { QuickGuideAssignSheet } from "@/components/scheduling/quick-guide-assign-sheet";

// =============================================================================
// TYPES
// =============================================================================

interface BookingNeedingGuide {
  bookingId: string;
  referenceNumber: string;
  participants: number;
  customer: {
    firstName: string;
    lastName: string;
  };
  tour: {
    id: string;
    name: string;
  };
  schedule: {
    id: string;
    startsAt: Date | string;
    endsAt: Date | string;
  };
  guidesAssigned: number;
  guidesRequired: number;
}

interface BookingsNeedingGuidesProps {
  bookings: BookingNeedingGuide[];
  orgSlug: string;
  maxItems?: number;
  className?: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatTimeLabel(date: Date | string): string {
  const d = new Date(date);
  return format(d, "h:mm a");
}

function getDayLabel(date: Date | string): string {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

function formatShortDate(date: Date | string): string {
  return format(new Date(date), "MMM d");
}

function formatTime(date: Date | string): string {
  return format(new Date(date), "h:mm a");
}

// =============================================================================
// BOOKING ROW COMPONENT
// =============================================================================

function BookingRow({
  booking,
  orgSlug,
  onAssignClick,
}: {
  booking: BookingNeedingGuide;
  orgSlug: string;
  onAssignClick: () => void;
}) {
  const guidesNeeded = booking.guidesRequired - booking.guidesAssigned;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
      {/* Booking Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/org/${orgSlug}/bookings/${booking.bookingId}` as Route}
            className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors"
          >
            {booking.tour.name}
          </Link>
          <span className="text-xs text-muted-foreground font-mono">
            {booking.referenceNumber}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {getDayLabel(booking.schedule.startsAt)} · {formatTimeLabel(booking.schedule.startsAt)}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {booking.participants} guest{booking.participants !== 1 ? "s" : ""}
          </span>
          <span>·</span>
          <span>
            {booking.customer.firstName} {booking.customer.lastName}
          </span>
        </div>
      </div>

      {/* Guide Status & Assign Button */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive font-medium whitespace-nowrap">
          {guidesNeeded > 1 ? `${guidesNeeded} guides needed` : "Needs guide"}
        </span>
        <button
          onClick={onAssignClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Assign
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BookingsNeedingGuides({
  bookings,
  orgSlug,
  maxItems = 5,
  className,
}: BookingsNeedingGuidesProps) {
  const [selectedBooking, setSelectedBooking] = useState<BookingNeedingGuide | null>(null);
  const [showAssignSheet, setShowAssignSheet] = useState(false);

  // Fetch available guides
  const { data: guidesData } = trpc.guide.list.useQuery(
    {},
    { enabled: showAssignSheet }
  );

  // Filter to only bookings that need guides
  const bookingsNeedingGuides = bookings
    .filter((b) => b.guidesAssigned < b.guidesRequired)
    .slice(0, maxItems);

  if (bookingsNeedingGuides.length === 0) {
    return null;
  }

  const handleAssignClick = (booking: BookingNeedingGuide) => {
    setSelectedBooking(booking);
    setShowAssignSheet(true);
  };

  const handleAssignSuccess = () => {
    setShowAssignSheet(false);
    setSelectedBooking(null);
  };

  return (
    <>
      <section className={className}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Needs Guide ({bookingsNeedingGuides.length})
          </h2>
          <Link
            href={`/org/${orgSlug}/guides` as Route}
            className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
          >
            Manage guides
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-xl border-2 border-destructive/20 bg-destructive/5 overflow-hidden divide-y divide-destructive/10">
          {bookingsNeedingGuides.map((booking) => (
            <BookingRow
              key={booking.bookingId}
              booking={booking}
              orgSlug={orgSlug}
              onAssignClick={() => handleAssignClick(booking)}
            />
          ))}
        </div>

        {bookings.filter((b) => b.guidesAssigned < b.guidesRequired).length > maxItems && (
          <div className="mt-2 text-center">
            <Link
              href={`/org/${orgSlug}/calendar` as Route}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all bookings needing guides →
            </Link>
          </div>
        )}
      </section>

      {/* Quick Assign Sheet */}
      {selectedBooking && (
        <QuickGuideAssignSheet
          open={showAssignSheet}
          onOpenChange={(open) => {
            setShowAssignSheet(open);
            if (!open) setSelectedBooking(null);
          }}
          bookingId={selectedBooking.bookingId}
          scheduleInfo={{
            id: selectedBooking.schedule.id,
            tourName: selectedBooking.tour.name,
            date: formatShortDate(selectedBooking.schedule.startsAt),
            time: formatTime(selectedBooking.schedule.startsAt),
          }}
          availableGuides={
            guidesData?.data
              ?.filter((g) => g.status === "active")
              .map((guide) => ({
                id: guide.id,
                firstName: guide.firstName,
                lastName: guide.lastName,
                email: guide.email,
                phone: guide.phone,
                status: guide.status as "active" | "inactive" | "pending",
              })) || []
          }
          onSuccess={handleAssignSuccess}
        />
      )}
    </>
  );
}
