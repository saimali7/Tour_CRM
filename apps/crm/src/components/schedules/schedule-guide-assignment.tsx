"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { User, AlertTriangle, Check, X, Loader2, UserCheck, UserX } from "lucide-react";
import { useConfirmModal, ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";

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
  const confirmModal = useConfirmModal();

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
      toast.success("Guide assigned successfully");
      setIsAssigning(false);
      setSelectedGuideId("");
      onAssignmentChange?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign guide");
    },
  });

  const reassignMutation = trpc.guideAssignment.reassignSchedule.useMutation({
    onSuccess: () => {
      utils.guideAssignment.getAssignmentsForSchedule.invalidate({ scheduleId });
      utils.schedule.getById.invalidate({ id: scheduleId });
      toast.success("Guide reassigned successfully");
      setIsAssigning(false);
      setSelectedGuideId("");
      onAssignmentChange?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reassign guide");
    },
  });

  const cancelMutation = trpc.guideAssignment.cancelAssignment.useMutation({
    onSuccess: () => {
      utils.guideAssignment.getAssignmentsForSchedule.invalidate({ scheduleId });
      utils.schedule.getById.invalidate({ id: scheduleId });
      toast.success("Guide assignment cancelled");
      onAssignmentChange?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel assignment");
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

  const handleCancel = async () => {
    if (!confirmedAssignment) return;

    const confirmed = await confirmModal.confirm({
      title: "Cancel Guide Assignment",
      description: "This will remove the guide from this schedule. The guide will be notified of the cancellation.",
      confirmLabel: "Cancel Assignment",
      variant: "destructive",
    });

    if (confirmed) {
      cancelMutation.mutate({ id: confirmedAssignment.id });
    }
  };

  const isLoading = loadingAssignments || loadingGuides;
  const isMutating =
    assignMutation.isPending || reassignMutation.isPending || cancelMutation.isPending;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading guide assignment...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Guide Assignment</h2>

      {/* Current Assignment Display */}
      {confirmedAssignment?.guide ? (
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4 p-4 bg-success/10 border border-success rounded-lg">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-success/20 rounded-lg">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground">
                    {confirmedAssignment.guide.firstName} {confirmedAssignment.guide.lastName}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium status-confirmed">
                    Confirmed
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{confirmedAssignment.guide.email}</p>
                {confirmedAssignment.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{confirmedAssignment.notes}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsAssigning(!isAssigning)}
              className="text-sm text-primary hover:text-primary/80 font-medium"
              disabled={isMutating}
            >
              {isAssigning ? "Cancel" : "Reassign"}
            </button>
          </div>
        </div>
      ) : pendingAssignment?.guide ? (
        <div className="mb-4">
          <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning rounded-lg">
            <div className="p-2 bg-warning/20 rounded-lg">
              <User className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-foreground">
                  {pendingAssignment.guide.firstName} {pendingAssignment.guide.lastName}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium status-pending">
                  Pending
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{pendingAssignment.guide.email}</p>
              {pendingAssignment.notes && (
                <p className="text-sm text-muted-foreground mt-2 italic">{pendingAssignment.notes}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-center gap-3 p-4 bg-muted border border-border rounded-lg">
            <div className="p-2 bg-accent rounded-lg">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">No guide assigned</p>
              <p className="text-sm text-muted-foreground">Assign a qualified guide to this schedule</p>
            </div>
            <button
              onClick={() => setIsAssigning(true)}
              className="text-sm text-primary hover:text-primary/80 font-medium"
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
          <p className="text-sm font-medium text-foreground">Previously Declined:</p>
          {declinedAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive rounded-lg"
            >
              <div className="p-1.5 bg-destructive/20 rounded">
                <UserX className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {assignment.guide?.firstName} {assignment.guide?.lastName}
                </p>
                {assignment.declineReason && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Reason: {assignment.declineReason}
                  </p>
                )}
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium status-cancelled">
                Declined
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Form */}
      {isAssigning && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div>
            <label htmlFor="guide-select" className="block text-sm font-medium text-foreground mb-2">
              Select Guide
            </label>
            <select
              id="guide-select"
              value={selectedGuideId}
              onChange={(e) => setSelectedGuideId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              disabled={isMutating}
            >
              <option value="">Choose a guide...</option>
              {qualifiedGuides?.map((guide) => (
                <option
                  key={guide.id}
                  value={guide.id}
                  disabled={!guide.isAvailable}
                  className={!guide.isAvailable ? "text-muted-foreground" : ""}
                >
                  {guide.firstName} {guide.lastName}
                  {guide.isPrimary ? " (Primary)" : ""}
                  {!guide.isAvailable ? " - Conflict" : ""}
                </option>
              ))}
            </select>
            {qualifiedGuides && qualifiedGuides.length === 0 && (
              <p className="text-sm text-warning mt-2 flex items-center gap-2">
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
                    <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Schedule Conflict Warning
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This guide has a conflicting schedule during this time. Proceeding will
                          create a double booking.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex items-start gap-2 p-3 bg-success/10 border border-success rounded-lg">
                    <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Available</p>
                      <p className="text-sm text-muted-foreground mt-1">
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
            <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">
                {assignMutation.error?.message || reassignMutation.error?.message}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAssign}
              disabled={!selectedGuideId || isMutating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              className="px-4 py-2 text-foreground border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            {confirmedAssignment && (
              <button
                onClick={handleCancel}
                disabled={isMutating}
                className="ml-auto px-4 py-2 text-destructive border border-destructive rounded-lg hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Remove Assignment
              </button>
            )}
          </div>
        </div>
      )}

      {confirmModal.ConfirmModal}
    </div>
  );
}
