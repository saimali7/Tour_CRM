"use client";

import { trpc } from "@/lib/trpc";
import { Calendar, Clock } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { dbDateToLocalDate, formatDbDateKey, formatLocalDateKey } from "@/lib/date-time";

interface GuideAssignmentsTabProps {
  guideId: string;
  orgSlug: string;
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

export function GuideAssignmentsTab({ guideId, orgSlug }: GuideAssignmentsTabProps) {
  const { data: assignments, isLoading } = trpc.guideAssignment.getAssignmentsForGuide.useQuery({
    guideId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const todayKey = formatLocalDateKey(new Date());
  const upcomingAssignments = assignments?.filter((a) => {
    if (!a.booking?.bookingDate) return false;
    return formatDbDateKey(a.booking.bookingDate) >= todayKey;
  }) || [];

  const pastAssignments = assignments?.filter((a) => {
    if (!a.booking?.bookingDate) return true;
    return formatDbDateKey(a.booking.bookingDate) < todayKey;
  }) || [];

  if (!assignments || assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-muted-foreground">No assignments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {upcomingAssignments.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Upcoming Assignments ({upcomingAssignments.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {upcomingAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/org/${orgSlug}/bookings/${assignment.bookingId}` as Route}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {assignment.booking?.tour?.name || "Unknown Tour"}
                      </Link>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          assignment.status === "confirmed" ? "bg-success/10 text-success" :
                          assignment.status === "pending" ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {assignment.booking?.bookingDate ? formatDate(dbDateToLocalDate(assignment.booking.bookingDate)) : "No date"}
                      {assignment.booking?.bookingTime && ` at ${assignment.booking.bookingTime}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {assignment.booking?.totalParticipants ?? 0} guests
                    </p>
                  </div>
                  <Link
                    href={`/org/${orgSlug}/bookings/${assignment.bookingId}` as Route}
                    className="text-primary hover:underline text-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pastAssignments.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Past Assignments ({pastAssignments.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {pastAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="px-6 py-4 flex items-center justify-between opacity-60"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/org/${orgSlug}/bookings/${assignment.bookingId}` as Route}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {assignment.booking?.tour?.name || "Unknown Tour"}
                      </Link>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          assignment.status === "confirmed" ? "bg-success/10 text-success" :
                          assignment.status === "pending" ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {assignment.booking?.bookingDate ? formatDate(dbDateToLocalDate(assignment.booking.bookingDate)) : "No date"}
                      {assignment.booking?.bookingTime && ` at ${assignment.booking.bookingTime}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {assignment.booking?.totalParticipants ?? 0} guests
                    </p>
                  </div>
                  <Link
                    href={`/org/${orgSlug}/bookings/${assignment.bookingId}` as Route}
                    className="text-primary hover:underline text-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
