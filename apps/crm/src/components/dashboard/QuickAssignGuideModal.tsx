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
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Assign Guide</h2>
              <p className="text-sm text-gray-500 mt-1">{tourName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
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
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : allGuides?.data && allGuides.data.length > 0 ? (
            <div className="space-y-2">
              {/* Available guides first */}
              {availableGuides && availableGuides.length > 0 && (
                <>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
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
                          : "border-gray-200 bg-white"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {guide.firstName} {guide.lastName}
                        </p>
                        <p className="text-sm text-green-600">Available</p>
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
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 mt-4">
                    Busy / Unavailable
                  </div>
                  {allGuides.data
                    .filter((g) => !availableGuideIds.has(g.id))
                    .map((guide) => (
                      <div
                        key={guide.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 bg-gray-50 opacity-60"
                      >
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-600 truncate">
                            {guide.firstName} {guide.lastName}
                          </p>
                          <p className="text-sm text-gray-400">Not available</p>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No guides found</p>
              <p className="text-xs text-gray-400 mt-1">Add guides in the Guides section</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
