"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { User, AlertTriangle, Check, X, Loader2, UserCheck, UserX } from "lucide-react";

interface ScheduleGuideAssignmentProps {
  scheduleId: string;
  tourId: string;
  startsAt: Date;
  endsAt: Date;
  onAssignmentChange?: () => void;
}

export function ScheduleGuideAssignment({
  scheduleId,
  tourId,
  startsAt,
  endsAt,
  onAssignmentChange,
}: ScheduleGuideAssignmentProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");

  const utils = trpc.useUtils();

  // Get current assignments for this schedule
  const { data: assignments, isLoading: loadingAssignments } =
    trpc.guideAssignment.getAssignmentsForSchedule.useQuery({
      scheduleId,
    });

  // Get qualified guides for this schedule
  const { data: qualifiedGuides, isLoading: loadingGuides } =
    trpc.tourGuideQualification.getQualifiedGuidesForScheduling.useQuery({
      tourId,
      startsAt,
      endsAt,
      excludeScheduleId: scheduleId,
    });

  // Find confirmed assignment
  const confirmedAssignment = assignments?.find((a) => a.status === "confirmed");
  const pendingAssignment = assignments?.find((a) => a.status === "pending");
  const declinedAssignments = assignments?.filter((a) => a.status === "declined");

  // Mutations
  const assignMutation = trpc.guideAssignment.assignGuideToSchedule.useMutation({
    onSuccess: () => {
      utils.guideAssignment.getAssignmentsForSchedule.invalidate({ scheduleId });
      utils.schedule.getById.invalidate({ id: scheduleId });
      setIsAssigning(false);
      setSelectedGuideId("");
      onAssignmentChange?.();
    },
  });

  const reassignMutation = trpc.guideAssignment.reassignSchedule.useMutation({
    onSuccess: () => {
      utils.guideAssignment.getAssignmentsForSchedule.invalidate({ scheduleId });
      utils.schedule.getById.invalidate({ id: scheduleId });
      setIsAssigning(false);
      setSelectedGuideId("");
      onAssignmentChange?.();
    },
  });

  const cancelMutation = trpc.guideAssignment.cancelAssignment.useMutation({
    onSuccess: () => {
      utils.guideAssignment.getAssignmentsForSchedule.invalidate({ scheduleId });
      utils.schedule.getById.invalidate({ id: scheduleId });
      onAssignmentChange?.();
    },
  });

  const handleAssign = () => {
    if (!selectedGuideId) return;

    if (confirmedAssignment) {
      // Reassign to new guide
      reassignMutation.mutate({
        scheduleId,
        newGuideId: selectedGuideId,
        options: { autoConfirm: true },
      });
    } else {
      // Assign new guide
      assignMutation.mutate({
        scheduleId,
        guideId: selectedGuideId,
        options: { autoConfirm: true },
      });
    }
  };

  const handleCancel = () => {
    if (!confirmedAssignment) return;

    if (window.confirm("Are you sure you want to cancel this guide assignment?")) {
      cancelMutation.mutate({ id: confirmedAssignment.id });
    }
  };

  const isLoading = loadingAssignments || loadingGuides;
  const isMutating =
    assignMutation.isPending || reassignMutation.isPending || cancelMutation.isPending;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="text-gray-500">Loading guide assignment...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Guide Assignment</h2>

      {/* Current Assignment Display */}
      {confirmedAssignment?.guide ? (
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">
                    {confirmedAssignment.guide.firstName} {confirmedAssignment.guide.lastName}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Confirmed
                  </span>
                </div>
                <p className="text-sm text-gray-600">{confirmedAssignment.guide.email}</p>
                {confirmedAssignment.notes && (
                  <p className="text-sm text-gray-600 mt-2 italic">{confirmedAssignment.notes}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsAssigning(!isAssigning)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              disabled={isMutating}
            >
              {isAssigning ? "Cancel" : "Reassign"}
            </button>
          </div>
        </div>
      ) : pendingAssignment?.guide ? (
        <div className="mb-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <User className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-gray-900">
                  {pendingAssignment.guide.firstName} {pendingAssignment.guide.lastName}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </div>
              <p className="text-sm text-gray-600">{pendingAssignment.guide.email}</p>
              {pendingAssignment.notes && (
                <p className="text-sm text-gray-600 mt-2 italic">{pendingAssignment.notes}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="p-2 bg-gray-100 rounded-lg">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">No guide assigned</p>
              <p className="text-sm text-gray-600">Assign a qualified guide to this schedule</p>
            </div>
            <button
              onClick={() => setIsAssigning(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              disabled={isMutating}
            >
              Assign Guide
            </button>
          </div>
        </div>
      )}

      {/* Declined Assignments */}
      {declinedAssignments && declinedAssignments.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Previously Declined:</p>
          {declinedAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="p-1.5 bg-red-100 rounded">
                <UserX className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {assignment.guide?.firstName} {assignment.guide?.lastName}
                </p>
                {assignment.declineReason && (
                  <p className="text-sm text-gray-600 mt-1">
                    Reason: {assignment.declineReason}
                  </p>
                )}
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Declined
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Form */}
      {isAssigning && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div>
            <label htmlFor="guide-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Guide
            </label>
            <select
              id="guide-select"
              value={selectedGuideId}
              onChange={(e) => setSelectedGuideId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isMutating}
            >
              <option value="">Choose a guide...</option>
              {qualifiedGuides?.map((guide) => (
                <option
                  key={guide.id}
                  value={guide.id}
                  disabled={!guide.isAvailable}
                  className={!guide.isAvailable ? "text-gray-400" : ""}
                >
                  {guide.firstName} {guide.lastName}
                  {guide.isPrimary ? " (Primary)" : ""}
                  {!guide.isAvailable ? " - Conflict" : ""}
                </option>
              ))}
            </select>
            {qualifiedGuides && qualifiedGuides.length === 0 && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                No qualified guides available for this tour
              </p>
            )}
          </div>

          {/* Guide Availability Info */}
          {selectedGuideId && qualifiedGuides && (
            <div>
              {(() => {
                const selectedGuide = qualifiedGuides.find((g) => g.id === selectedGuideId);
                if (!selectedGuide) return null;

                if (!selectedGuide.isAvailable) {
                  return (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">
                          Schedule Conflict Warning
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                          This guide has a conflicting schedule during this time. Proceeding will
                          create a double booking.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Available</p>
                      <p className="text-sm text-green-700 mt-1">
                        This guide is available for the selected time slot.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Error Display */}
          {(assignMutation.error || reassignMutation.error) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                {assignMutation.error?.message || reassignMutation.error?.message}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAssign}
              disabled={!selectedGuideId || isMutating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmedAssignment ? "Reassign Guide" : "Assign Guide"}
            </button>
            <button
              onClick={() => {
                setIsAssigning(false);
                setSelectedGuideId("");
              }}
              disabled={isMutating}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            {confirmedAssignment && (
              <button
                onClick={handleCancel}
                disabled={isMutating}
                className="ml-auto px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Remove Assignment
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
