"use client";

import { useCallback, useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// =============================================================================
// TYPES
// =============================================================================

interface AssignmentAction {
  id: string;
  type: "assign" | "reassign" | "unassign";
  bookingId: string;
  bookingLabel: string; // Customer name or reference for display
  fromGuideId?: string | null;
  fromGuideName?: string | null;
  toGuideId?: string | null;
  toGuideName?: string | null;
  timestamp: number;
  // For undo
  previousState?: {
    guideId: string | null;
    guideName: string | null;
  };
}

interface UseLiveAssignmentOptions {
  /** Current date for the dispatch */
  date: Date;
  /** Called after any successful mutation */
  onSuccess?: () => void;
}

export interface UseLiveAssignmentReturn {
  /** Assign a booking to a guide (from unassigned/hopper) */
  assignBooking: (bookingId: string, guideId: string, guideName: string, bookingLabel: string) => Promise<void>;
  /** Reassign a booking from one guide to another */
  reassignBooking: (bookingId: string, fromGuideId: string, fromGuideName: string, toGuideId: string, toGuideName: string, bookingLabel: string) => Promise<void>;
  /** Unassign a booking from its current guide */
  unassignBooking: (bookingId: string, fromGuideId: string, fromGuideName: string, bookingLabel: string) => Promise<void>;
  /** Set of booking IDs currently being modified */
  pendingBookingIds: Set<string>;
  /** Check if a specific booking is being modified */
  isBookingPending: (bookingId: string) => boolean;
  /** Undo the last action (if available) */
  undoLastAction: () => Promise<void>;
  /** Whether an undo is available */
  canUndo: boolean;
}

// Undo window in milliseconds
const UNDO_WINDOW_MS = 5000;

// =============================================================================
// HOOK
// =============================================================================

export function useLiveAssignment({
  date,
  onSuccess,
}: UseLiveAssignmentOptions): UseLiveAssignmentReturn {
  const utils = trpc.useUtils();

  // Track pending operations for loading states
  const [pendingBookingIds, setPendingBookingIds] = useState<Set<string>>(new Set());

  // Track last action for undo
  const lastActionRef = useRef<AssignmentAction | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  // Ref to hold the undo function - avoids stale closure in toast onClick
  const undoFnRef = useRef<(() => Promise<void>) | null>(null);

  // Helper to add/remove pending booking
  const addPending = useCallback((bookingId: string) => {
    setPendingBookingIds(prev => new Set(prev).add(bookingId));
  }, []);

  const removePending = useCallback((bookingId: string) => {
    setPendingBookingIds(prev => {
      const next = new Set(prev);
      next.delete(bookingId);
      return next;
    });
  }, []);

  // Invalidate dispatch data to refresh UI
  const invalidateDispatch = useCallback(() => {
    utils.commandCenter.getDispatch.invalidate({ date });
  }, [utils, date]);

  // Clear undo state helper
  const clearUndoState = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
    lastActionRef.current = null;
    setCanUndo(false);
  }, []);

  // Manual assign mutation
  const assignMutation = trpc.commandCenter.manualAssign.useMutation({
    onSuccess: () => {
      invalidateDispatch();
      onSuccess?.();
    },
  });

  // Unassign mutation
  const unassignMutation = trpc.commandCenter.unassign.useMutation({
    onSuccess: () => {
      invalidateDispatch();
      onSuccess?.();
    },
  });

  // ==========================================================================
  // ASSIGN BOOKING (from hopper to guide)
  // ==========================================================================
  const assignBooking = useCallback(async (
    bookingId: string,
    guideId: string,
    guideName: string,
    bookingLabel: string
  ) => {
    // Clear any existing undo state before starting new action
    clearUndoState();
    addPending(bookingId);

    try {
      await assignMutation.mutateAsync({ bookingId, guideId });

      // Store for undo
      const action: AssignmentAction = {
        id: crypto.randomUUID(),
        type: "assign",
        bookingId,
        bookingLabel,
        toGuideId: guideId,
        toGuideName: guideName,
        previousState: { guideId: null, guideName: null },
        timestamp: Date.now(),
      };
      lastActionRef.current = action;
      setCanUndo(true);

      // Show success toast with undo action
      const toastId = toast.success(`Assigned ${bookingLabel} to ${guideName}`, {
        action: {
          label: "Undo",
          onClick: () => {
            // Use ref to avoid stale closure
            undoFnRef.current?.();
          },
        },
        duration: UNDO_WINDOW_MS,
      });
      toastIdRef.current = toastId;

      // Auto-clear undo after window expires
      undoTimeoutRef.current = setTimeout(() => {
        lastActionRef.current = null;
        toastIdRef.current = null;
        setCanUndo(false);
      }, UNDO_WINDOW_MS);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // Make error messages more user-friendly
      if (errorMessage.includes("conflicting assignment")) {
        toast.error(`${guideName} has a schedule conflict`, {
          description: "This guide already has a tour at this time. Try a different guide.",
        });
      } else {
        toast.error("Failed to assign booking", {
          description: errorMessage,
        });
      }
      throw error;
    } finally {
      removePending(bookingId);
    }
  }, [addPending, removePending, assignMutation, clearUndoState]);

  // ==========================================================================
  // REASSIGN BOOKING (from one guide to another)
  // ==========================================================================
  const reassignBooking = useCallback(async (
    bookingId: string,
    fromGuideId: string,
    fromGuideName: string,
    toGuideId: string,
    toGuideName: string,
    bookingLabel: string
  ) => {
    // Clear any existing undo state before starting new action
    clearUndoState();
    addPending(bookingId);

    try {
      // First unassign from current guide
      await unassignMutation.mutateAsync({ bookingId });

      // Then assign to new guide
      await assignMutation.mutateAsync({ bookingId, guideId: toGuideId });

      // Store for undo
      const action: AssignmentAction = {
        id: crypto.randomUUID(),
        type: "reassign",
        bookingId,
        bookingLabel,
        fromGuideId,
        fromGuideName,
        toGuideId,
        toGuideName,
        previousState: { guideId: fromGuideId, guideName: fromGuideName },
        timestamp: Date.now(),
      };
      lastActionRef.current = action;
      setCanUndo(true);

      // Show success toast with undo action
      const toastId = toast.success(`Moved ${bookingLabel} from ${fromGuideName} to ${toGuideName}`, {
        action: {
          label: "Undo",
          onClick: () => {
            undoFnRef.current?.();
          },
        },
        duration: UNDO_WINDOW_MS,
      });
      toastIdRef.current = toastId;

      // Auto-clear undo after window expires
      undoTimeoutRef.current = setTimeout(() => {
        lastActionRef.current = null;
        toastIdRef.current = null;
        setCanUndo(false);
      }, UNDO_WINDOW_MS);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // If assign failed after unassign, try to restore
      if (assignMutation.isError && !unassignMutation.isError) {
        try {
          await assignMutation.mutateAsync({ bookingId, guideId: fromGuideId });
          toast.error("Reassignment failed - restored original assignment");
        } catch {
          toast.error("Reassignment failed - booking may be unassigned", {
            description: "Please refresh and try again",
          });
        }
      } else if (errorMessage.includes("conflicting assignment")) {
        toast.error(`${toGuideName} has a schedule conflict`, {
          description: "This guide already has a tour at this time. Try a different guide.",
        });
      } else {
        toast.error("Failed to reassign booking", {
          description: errorMessage,
        });
      }
      throw error;
    } finally {
      removePending(bookingId);
    }
  }, [addPending, removePending, assignMutation, unassignMutation, clearUndoState]);

  // ==========================================================================
  // UNASSIGN BOOKING (remove from guide)
  // ==========================================================================
  const unassignBooking = useCallback(async (
    bookingId: string,
    fromGuideId: string,
    fromGuideName: string,
    bookingLabel: string
  ) => {
    // Clear any existing undo state before starting new action
    clearUndoState();
    addPending(bookingId);

    try {
      await unassignMutation.mutateAsync({ bookingId });

      // Store for undo
      const action: AssignmentAction = {
        id: crypto.randomUUID(),
        type: "unassign",
        bookingId,
        bookingLabel,
        fromGuideId,
        fromGuideName,
        previousState: { guideId: fromGuideId, guideName: fromGuideName },
        timestamp: Date.now(),
      };
      lastActionRef.current = action;
      setCanUndo(true);

      // Show success toast with undo action
      const toastId = toast.success(`Removed ${bookingLabel} from ${fromGuideName}`, {
        action: {
          label: "Undo",
          onClick: () => {
            undoFnRef.current?.();
          },
        },
        duration: UNDO_WINDOW_MS,
      });
      toastIdRef.current = toastId;

      // Auto-clear undo after window expires
      undoTimeoutRef.current = setTimeout(() => {
        lastActionRef.current = null;
        toastIdRef.current = null;
        setCanUndo(false);
      }, UNDO_WINDOW_MS);
    } catch (error) {
      toast.error("Failed to unassign booking", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    } finally {
      removePending(bookingId);
    }
  }, [addPending, removePending, unassignMutation, clearUndoState]);

  // ==========================================================================
  // UNDO LAST ACTION
  // ==========================================================================
  const undoLastAction = useCallback(async () => {
    const lastAction = lastActionRef.current;
    if (!lastAction || !lastAction.previousState) return;

    // Clear undo state immediately
    clearUndoState();

    const { bookingId, bookingLabel, previousState, type } = lastAction;
    addPending(bookingId);

    try {
      if (type === "assign") {
        // Undo assign = unassign
        await unassignMutation.mutateAsync({ bookingId });
        toast.success(`Undone: ${bookingLabel} removed from assignment`);
      } else if (type === "unassign" && previousState.guideId) {
        // Undo unassign = reassign to original guide
        await assignMutation.mutateAsync({ bookingId, guideId: previousState.guideId });
        toast.success(`Undone: ${bookingLabel} restored to ${previousState.guideName}`);
      } else if (type === "reassign" && previousState.guideId) {
        // Undo reassign = move back to original guide
        await unassignMutation.mutateAsync({ bookingId });
        await assignMutation.mutateAsync({ bookingId, guideId: previousState.guideId });
        toast.success(`Undone: ${bookingLabel} restored to ${previousState.guideName}`);
      }
    } catch (error) {
      toast.error("Failed to undo", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      removePending(bookingId);
    }
  }, [addPending, removePending, assignMutation, unassignMutation, clearUndoState]);

  // Keep the undo function ref updated to avoid stale closures in toast callbacks
  undoFnRef.current = undoLastAction;

  // Helper to check if a booking is pending
  const isBookingPending = useCallback((bookingId: string) => {
    return pendingBookingIds.has(bookingId);
  }, [pendingBookingIds]);

  return {
    assignBooking,
    reassignBooking,
    unassignBooking,
    pendingBookingIds,
    isBookingPending,
    undoLastAction,
    canUndo,
  };
}
