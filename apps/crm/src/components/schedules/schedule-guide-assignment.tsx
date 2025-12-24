"use client";

import { trpc } from "@/lib/trpc";
import { AlertTriangle, Check, Loader2, UserCheck, User, UserX, Info } from "lucide-react";
import { useConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScheduleGuideAssignmentProps {
  scheduleId: string;
  onAssignmentChange?: () => void;
}

export function ScheduleGuideAssignment({
  scheduleId,
  onAssignmentChange,
}: ScheduleGuideAssignmentProps) {
  const confirmModal = useConfirmModal();
  const utils = trpc.useUtils();

  // Get schedule data for staffing information
  const { data: schedule, isLoading: loadingSchedule } = trpc.schedule.getById.useQuery(
    { id: scheduleId },
    { enabled: !!scheduleId }
  );

  // Get current assignments for this schedule (read-only display)
  const { data: assignments, isLoading: loadingAssignments } =
    trpc.guideAssignment.getAssignmentsForSchedule.useQuery({
      scheduleId,
    });

  // Cancel assignment mutation (only mutation we keep)
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

  // Group assignments by status
  const confirmedAssignments = assignments?.filter((a) => a.status === "confirmed") || [];
  const pendingAssignments = assignments?.filter((a) => a.status === "pending") || [];
  const declinedAssignments = assignments?.filter((a) => a.status === "declined") || [];

  // Staffing information
  const guidesRequired = schedule?.guidesRequired || 0;
  const guidesAssigned = schedule?.guidesAssigned || 0;
  const needsMoreGuides = guidesAssigned < guidesRequired;

  const handleCancelAssignment = async (assignmentId: string, guideName: string) => {
    const confirmed = await confirmModal.confirm({
      title: "Cancel Guide Assignment",
      description: `This will remove ${guideName} from this schedule. The guide will be notified of the cancellation.`,
      confirmLabel: "Cancel Assignment",
      variant: "destructive",
    });

    if (confirmed) {
      cancelMutation.mutate({ id: assignmentId });
    }
  };

  const isLoading = loadingAssignments || loadingSchedule;
  const isMutating = cancelMutation.isPending;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading guide assignments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Guide Staffing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {guidesAssigned} of {guidesRequired} guides assigned
        </p>
      </div>

      {/* Staffing Status Banner */}
      <div className={cn(
        "p-4 rounded-lg border",
        needsMoreGuides
          ? "bg-amber-500/10 border-amber-500/20"
          : "bg-emerald-500/10 border-emerald-500/20"
      )}>
        <div className="flex items-start gap-3">
          {needsMoreGuides ? (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Needs {guidesRequired - guidesAssigned} more guide{guidesRequired - guidesAssigned !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assign guides through individual booking details pages
                </p>
              </div>
            </>
          ) : (
            <>
              <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Fully staffed</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All required guides are assigned
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info Box - How to assign guides */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">How to assign guides</p>
            <p className="text-xs text-muted-foreground mt-1">
              Guide assignments are managed at the booking level. To assign a guide, go to each booking's detail page and assign guides there. The assignments will automatically aggregate here.
            </p>
          </div>
        </div>
      </div>

      {/* Current Assignments List */}
      {(confirmedAssignments.length > 0 || pendingAssignments.length > 0 || declinedAssignments.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Current Assignments
          </h3>

          {/* Confirmed Assignments */}
          {confirmedAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
            >
              <div className="p-2 bg-emerald-500/20 rounded-lg flex-shrink-0">
                <UserCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium text-foreground">
                    {assignment.guide?.firstName} {assignment.guide?.lastName}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium status-confirmed">
                    Confirmed
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{assignment.guide?.email}</p>
                {assignment.booking && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Booking: {assignment.booking.id.slice(0, 8)}...
                  </p>
                )}
                {assignment.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{assignment.notes}</p>
                )}
              </div>
              <button
                onClick={() => handleCancelAssignment(
                  assignment.id,
                  `${assignment.guide?.firstName} ${assignment.guide?.lastName}`
                )}
                disabled={isMutating}
                className="text-xs text-destructive hover:text-destructive/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ))}

          {/* Pending Assignments */}
          {pendingAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg"
            >
              <div className="p-2 bg-amber-500/20 rounded-lg flex-shrink-0">
                <User className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium text-foreground">
                    {assignment.guide?.firstName} {assignment.guide?.lastName}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium status-pending">
                    Pending
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{assignment.guide?.email}</p>
                {assignment.booking && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Booking: {assignment.booking.id.slice(0, 8)}...
                  </p>
                )}
              </div>
              <button
                onClick={() => handleCancelAssignment(
                  assignment.id,
                  `${assignment.guide?.firstName} ${assignment.guide?.lastName}`
                )}
                disabled={isMutating}
                className="text-xs text-destructive hover:text-destructive/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                Cancel
              </button>
            </div>
          ))}

          {/* Declined Assignments */}
          {declinedAssignments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Previously Declined
              </p>
              {declinedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <div className="p-1.5 bg-destructive/20 rounded flex-shrink-0">
                    <UserX className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {assignment.guide?.firstName} {assignment.guide?.lastName}
                    </p>
                    {assignment.booking && (
                      <p className="text-xs text-muted-foreground">
                        Booking: {assignment.booking.id.slice(0, 8)}...
                      </p>
                    )}
                    {assignment.declineReason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {assignment.declineReason}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium status-cancelled flex-shrink-0">
                    Declined
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No assignments message */}
      {confirmedAssignments.length === 0 && pendingAssignments.length === 0 && declinedAssignments.length === 0 && (
        <div className="p-4 bg-muted border border-border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent rounded-lg">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No guide assignments yet</p>
              <p className="text-sm text-muted-foreground">
                Assign guides through individual booking pages
              </p>
            </div>
          </div>
        </div>
      )}

      {confirmModal.ConfirmModal}
    </div>
  );
}
