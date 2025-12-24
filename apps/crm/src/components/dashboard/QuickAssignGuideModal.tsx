"use client";

import { X, AlertCircle, Users } from "lucide-react";

interface QuickAssignGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleId: string;
  tourName: string;
  startsAt: Date;
  endsAt: Date;
  onSuccess?: () => void;
}

/**
 * QuickAssignGuideModal - Deprecated
 *
 * Guide assignment is now done at the booking level, not schedule level.
 * This modal now just explains the new workflow.
 */
export function QuickAssignGuideModal({
  isOpen,
  onClose,
  tourName,
  startsAt,
  endsAt,
}: QuickAssignGuideModalProps) {
  if (!isOpen) return null;

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
      <div className="relative bg-card rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Guide Assignment</h2>
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
            <span>
              {formatDate(startsAt)} • {formatTime(startsAt)} - {formatTime(endsAt)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Guide assignment is now per booking
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Guides are now assigned to individual bookings rather than schedules.
                This allows multiple guides to share the workload based on capacity.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Open a booking to assign a guide</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
