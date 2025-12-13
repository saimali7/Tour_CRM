"use client";

import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@tour/ui";
import {
  Card,
  CardContent,
} from "@tour/ui";
import { Badge } from "@tour/ui";
import { Skeleton } from "@tour/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tour/ui";

export default function AssignmentsPage() {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "declined"
  >("all");

  const { data: assignments, isLoading } = trpc.guidePortal.getMyAssignments.useQuery(
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  const utils = trpc.useUtils();

  const confirmMutation = trpc.guidePortal.confirmAssignment.useMutation({
    onSuccess: () => {
      utils.guidePortal.getMyAssignments.invalidate();
      utils.guidePortal.getMyDashboard.invalidate();
    },
  });

  const declineMutation = trpc.guidePortal.declineAssignment.useMutation({
    onSuccess: () => {
      utils.guidePortal.getMyAssignments.invalidate();
      utils.guidePortal.getMyDashboard.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!assignments) {
    return <div>Failed to load assignments</div>;
  }

  const pendingAssignments = assignments.filter((a) => a.status === "pending");
  const confirmedAssignments = assignments.filter((a) => a.status === "confirmed");
  const declinedAssignments = assignments.filter((a) => a.status === "declined");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
        <p className="text-gray-600 mt-1">
          View and manage your tour assignments
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmed ({confirmedAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="declined">
            Declined ({declinedAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {assignments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No assignments found
              </CardContent>
            </Card>
          ) : (
            <AssignmentsList
              assignments={assignments}
              onConfirm={confirmMutation}
              onDecline={declineMutation}
            />
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingAssignments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No pending assignments
              </CardContent>
            </Card>
          ) : (
            <AssignmentsList
              assignments={pendingAssignments}
              onConfirm={confirmMutation}
              onDecline={declineMutation}
            />
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-3 mt-4">
          {confirmedAssignments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No confirmed assignments
              </CardContent>
            </Card>
          ) : (
            <AssignmentsList
              assignments={confirmedAssignments}
              onConfirm={confirmMutation}
              onDecline={declineMutation}
            />
          )}
        </TabsContent>

        <TabsContent value="declined" className="space-y-3 mt-4">
          {declinedAssignments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No declined assignments
              </CardContent>
            </Card>
          ) : (
            <AssignmentsList
              assignments={declinedAssignments}
              onConfirm={confirmMutation}
              onDecline={declineMutation}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssignmentsList({
  assignments,
  onConfirm,
  onDecline,
}: {
  assignments: any[];
  onConfirm: any;
  onDecline: any;
}) {
  return (
    <div className="space-y-3">
      {assignments.map((assignment) => {
        const totalParticipants = assignment.schedule.bookings.reduce(
          (sum: number, booking: any) => sum + booking.participants,
          0
        );

        const isPending = assignment.status === "pending";
        const isConfirmed = assignment.status === "confirmed";
        const isDeclined = assignment.status === "declined";

        return (
          <Card
            key={assignment.id}
            className={
              isPending
                ? "border-amber-200 bg-amber-50"
                : isConfirmed
                ? "border-green-200 bg-green-50"
                : "border-gray-200"
            }
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">
                      {assignment.schedule.tour.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        isPending
                          ? "bg-amber-100"
                          : isConfirmed
                          ? "bg-green-100"
                          : "bg-gray-100"
                      }
                    >
                      {isPending && (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                      {isConfirmed && (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmed
                        </>
                      )}
                      {isDeclined && (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Declined
                        </>
                      )}
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
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {assignment.notes && (
                    <p className="text-sm text-gray-500 mt-2">{assignment.notes}</p>
                  )}

                  {isDeclined && assignment.declineReason && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                      <span className="font-medium">Decline Reason: </span>
                      {assignment.declineReason}
                    </div>
                  )}

                  {isConfirmed && assignment.confirmedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      Confirmed on {format(new Date(assignment.confirmedAt), "PPP")}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => onConfirm.mutate({ id: assignment.id })}
                        disabled={onConfirm.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onDecline.mutate({
                            id: assignment.id,
                            reason: "Not available",
                          })
                        }
                        disabled={onDecline.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </>
                  )}
                  {isConfirmed && (
                    <Link href={`/guide/schedule/${assignment.schedule.id}`}>
                      <Button size="sm" variant="outline">
                        View Manifest
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
