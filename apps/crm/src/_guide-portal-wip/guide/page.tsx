"use client";

import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@tour/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@tour/ui";
import { Badge } from "@tour/ui";
import { Skeleton } from "@tour/ui";

export default function GuideDashboardPage() {
  const { data: dashboard, isLoading } = trpc.guidePortal.getMyDashboard.useQuery();
  const utils = trpc.useUtils();

  const confirmMutation = trpc.guidePortal.confirmAssignment.useMutation({
    onSuccess: () => {
      utils.guidePortal.getMyDashboard.invalidate();
    },
  });

  const declineMutation = trpc.guidePortal.declineAssignment.useMutation({
    onSuccess: () => {
      utils.guidePortal.getMyDashboard.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!dashboard) {
    return <div>Failed to load dashboard</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's an overview of your upcoming tours and assignments.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Tours</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.stats.upcomingCount}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting your response</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Assignments */}
      {dashboard.pendingAssignments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Pending Assignments
          </h2>
          <div className="space-y-3">
            {dashboard.pendingAssignments.map((assignment) => (
              <Card key={assignment.id} className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {assignment.schedule.tour.name}
                        </h3>
                        <Badge variant="outline" className="bg-amber-100">
                          Pending
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {format(new Date(assignment.schedule.startsAt), "PPP 'at' p")}
                        </div>
                        {assignment.schedule.meetingPoint && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {assignment.schedule.meetingPoint}
                          </div>
                        )}
                        {assignment.notes && (
                          <p className="text-gray-500 mt-2">{assignment.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => confirmMutation.mutate({ id: assignment.id })}
                        disabled={confirmMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          declineMutation.mutate({
                            id: assignment.id,
                            reason: "Not available",
                          })
                        }
                        disabled={declineMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Tours */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Upcoming Tours (Next 7 Days)
        </h2>
        {dashboard.upcomingSchedules.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No upcoming tours scheduled
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {dashboard.upcomingSchedules.map((schedule) => {
              const totalParticipants = schedule.bookings.reduce(
                (sum, booking) => sum + booking.participants,
                0
              );

              return (
                <Card key={schedule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {schedule.tour.name}
                          </h3>
                          <Badge variant="outline" className="bg-green-100">
                            Confirmed
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {format(new Date(schedule.startsAt), "PPP 'at' p")}
                          </div>
                          {schedule.meetingPoint && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {schedule.meetingPoint}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
                            {schedule.maxParticipants && (
                              <span className="text-gray-400">
                                / {schedule.maxParticipants} max
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Link href={`/guide/schedule/${schedule.id}`}>
                          <Button size="sm" variant="outline">
                            View Manifest
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
