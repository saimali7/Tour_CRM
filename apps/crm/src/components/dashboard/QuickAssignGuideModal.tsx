"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { X, UserCheck, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAssignGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleId: string;
  tourName: string;
  startsAt: Date;
  endsAt: Date;
  onSuccess?: () => void;
}

export function QuickAssignGuideModal({
  isOpen,
  onClose,
  scheduleId,
  tourName,
  startsAt,
  endsAt,
  onSuccess,
}: QuickAssignGuideModalProps) {
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: availableGuides, isLoading: loadingGuides } = trpc.guide.getAvailableForTime.useQuery(
    { startsAt, endsAt, excludeScheduleId: scheduleId },
    { enabled: isOpen }
  );

  const { data: allGuides, isLoading: loadingAllGuides } = trpc.guide.list.useQuery(
    { filters: { status: "active" } },
    { enabled: isOpen }
  );

  const assignMutation = trpc.guideAssignment.assignGuideToSchedule.useMutation({
    onSuccess: () => {
      utils.dashboard.getOperationsDashboard.invalidate();
      utils.schedule.list.invalidate();
      onSuccess?.();
      onClose();
    },
  });

  if (!isOpen) return null;

  const availableGuideIds = new Set(availableGuides?.map((g) => g.id) || []);

  const handleAssign = (guideId: string) => {
    assignMutation.mutate({
      scheduleId,
      guideId,
      options: { autoConfirm: false },
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Assign Guide</h2>
              <p className="text-sm text-muted-foreground mt-1">{tourName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {formatDate(startsAt)} • {formatTime(startsAt)} - {formatTime(endsAt)}
            </span>
          </div>
        </div>

        {/* Guide List */}
        <div className="px-6 py-4 overflow-y-auto max-h-[400px]">
          {loadingGuides || loadingAllGuides ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allGuides?.data && allGuides.data.length > 0 ? (
            <div className="space-y-2">
              {/* Available guides first */}
              {availableGuides && availableGuides.length > 0 && (
                <>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Available ({availableGuides.length})
                  </div>
                  {availableGuides.map((guide) => (
                    <button
                      key={guide.id}
                      onClick={() => handleAssign(guide.id)}
                      disabled={assignMutation.isPending}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors",
                        "hover:border-primary hover:bg-primary/5",
                        selectedGuideId === guide.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="h-5 w-5 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {guide.firstName} {guide.lastName}
                        </p>
                        <p className="text-sm text-success">Available</p>
                      </div>
                      {assignMutation.isPending && selectedGuideId === guide.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* Unavailable guides */}
              {allGuides.data.filter((g) => !availableGuideIds.has(g.id)).length > 0 && (
                <>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 mt-4">
                    Busy / Unavailable
                  </div>
                  {allGuides.data
                    .filter((g) => !availableGuideIds.has(g.id))
                    .map((guide) => (
                      <div
                        key={guide.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-muted opacity-60"
                      >
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-muted-foreground truncate">
                            {guide.firstName} {guide.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">Not available</p>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No guides found</p>
              <p className="text-xs text-muted-foreground mt-1">Add guides in the Guides section</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
