"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Represents a pending guide reassignment change
 */
export interface PendingReassignChange {
  id: string;
  type: "reassign" | "swap";
  tourRunId: string;
  segmentId: string;
  fromGuideId: string;
  toGuideId: string;
  toGuideName?: string;
  bookingIds?: string[];
  timestamp: number;
}

/**
 * Represents a pending time shift change (moving a segment to a different time)
 */
export interface PendingTimeShiftChange {
  id: string;
  type: "time-shift";
  segmentId: string;
  guideId: string;
  bookingIds?: string[];
  /** Original start time in HH:MM format */
  originalStartTime: string;
  /** New start time in HH:MM format */
  newStartTime: string;
  /** Original end time in HH:MM format */
  originalEndTime: string;
  /** New end time in HH:MM format (calculated from duration) */
  newEndTime: string;
  /** Duration in minutes (preserved) */
  durationMinutes: number;
  timestamp: number;
}

/**
 * Represents a pending booking assignment from hopper
 */
export interface PendingAssignChange {
  id: string;
  type: "assign";
  bookingId: string;
  toGuideId: string;
  toGuideName: string;
  /** The index of the timeline row in the timelines array */
  timelineIndex: number;
  /** Booking data for rendering on timeline */
  bookingData: {
    customerName: string;
    guestCount: number;
    tourName: string;
    tourTime: string; // Format: "HH:mm"
    pickupZone?: { id: string; name: string; color?: string } | null;
  };
  timestamp: number;
}

export type PendingChange = PendingReassignChange | PendingAssignChange | PendingTimeShiftChange;

interface AdjustModeContextType {
  /** Whether adjust mode is currently active */
  isAdjustMode: boolean;
  /** Toggle adjust mode on/off */
  toggleAdjustMode: () => void;
  /** Enter adjust mode */
  enterAdjustMode: () => void;
  /** Exit adjust mode and optionally clear changes */
  exitAdjustMode: (clearChanges?: boolean) => void;
  /** List of pending changes to be applied */
  pendingChanges: PendingChange[];
  /** Add a new pending change */
  addPendingChange: (change: Omit<PendingChange, "id" | "timestamp">) => void;
  /** Remove a pending change by ID */
  removePendingChange: (id: string) => void;
  /** Clear all pending changes */
  clearPendingChanges: () => void;
  /** Undo the most recent change */
  undo: () => void;
  /** Redo the most recently undone change */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** @deprecated Use undo() instead */
  undoLastChange: () => void;
  /** Whether there are pending changes */
  hasPendingChanges: boolean;
  /** The count of pending changes */
  pendingChangesCount: number;
  /** Check if a booking is already in pending changes */
  isBookingPendingAssignment: (bookingId: string) => boolean;
  /** Get all booking IDs that have pending assignments */
  pendingAssignedBookingIds: Set<string>;
  /** Get summary of pending changes by guide */
  getPendingChangesSummary: () => PendingChangesSummary;
  /** Get pending time shift for a segment (if any) */
  getTimeShiftForSegment: (segmentId: string) => PendingTimeShiftChange | null;
  /** Get all pending time shifts */
  pendingTimeShifts: PendingTimeShiftChange[];
}

/**
 * Summary of pending changes for display
 */
export interface PendingChangesSummary {
  totalChanges: number;
  assignments: Array<{
    id: string;
    customerName: string;
    guestCount: number;
    toGuideName: string;
    tourName: string;
    tourTime: string;
    pickupZone?: { name: string; color?: string } | null;
  }>;
  reassignments: Array<{
    id: string;
    segmentId: string;
    fromGuideId: string;
    toGuideId: string;
    toGuideName?: string;
    bookingCount: number;
  }>;
  timeShifts: Array<{
    id: string;
    segmentId: string;
    originalStartTime: string;
    newStartTime: string;
    durationMinutes: number;
  }>;
  impactByGuide: Map<string, { guestDelta: number; guideName: string }>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AdjustModeContext = createContext<AdjustModeContextType | null>(null);

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_UNDO_STACK_SIZE = 50; // Limit memory usage

// =============================================================================
// PROVIDER
// =============================================================================

interface AdjustModeProviderProps {
  children: ReactNode;
}

export function AdjustModeProvider({ children }: AdjustModeProviderProps) {
  const [isAdjustMode, setIsAdjustMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [undoStack, setUndoStack] = useState<PendingChange[][]>([]);
  const [redoStack, setRedoStack] = useState<PendingChange[][]>([]);

  // Track if we're in an undo/redo operation to avoid pushing to stack
  const isUndoRedoOperation = useRef(false);

  // Push current state to undo stack before making changes
  const pushToUndoStack = useCallback((currentState: PendingChange[]) => {
    if (isUndoRedoOperation.current) return;

    setUndoStack((prev) => {
      const newStack = [...prev, currentState];
      // Limit stack size to prevent memory issues
      if (newStack.length > MAX_UNDO_STACK_SIZE) {
        return newStack.slice(-MAX_UNDO_STACK_SIZE);
      }
      return newStack;
    });
    // Clear redo stack when new changes are made
    setRedoStack([]);
  }, []);

  const toggleAdjustMode = useCallback(() => {
    setIsAdjustMode((prev) => {
      if (prev) {
        // Exiting adjust mode - clear everything
        setPendingChanges([]);
        setUndoStack([]);
        setRedoStack([]);
      }
      return !prev;
    });
  }, []);

  const enterAdjustMode = useCallback(() => {
    setIsAdjustMode(true);
  }, []);

  const exitAdjustMode = useCallback((clearChanges = true) => {
    setIsAdjustMode(false);
    if (clearChanges) {
      setPendingChanges([]);
      setUndoStack([]);
      setRedoStack([]);
    }
  }, []);

  const addPendingChange = useCallback(
    (change: Omit<PendingChange, "id" | "timestamp">) => {
      setPendingChanges((prev) => {
        // For assign: Check if booking is already assigned (prevent double-assignment)
        if (change.type === "assign") {
          const assignChange = change as Omit<PendingAssignChange, "id" | "timestamp">;
          const existingAssign = prev.find(
            (c) => c.type === "assign" && (c as PendingAssignChange).bookingId === assignChange.bookingId
          ) as PendingAssignChange | undefined;

          if (existingAssign) {
            // Show warning and reject the duplicate
            toast.warning("Booking already assigned", {
              description: `Already assigned to ${existingAssign.toGuideName}. Remove that assignment first.`,
            });
            return prev; // Don't add duplicate
          }
        }

        // Save current state to undo stack before making changes
        pushToUndoStack(prev);

        // For reassign/swap: Check if segment is already being reassigned
        if (change.type === "reassign" || change.type === "swap") {
          const reassignChange = change as Omit<PendingReassignChange, "id" | "timestamp">;
          const existingIndex = prev.findIndex(
            (c) => (c.type === "reassign" || c.type === "swap") &&
                   (c as PendingReassignChange).segmentId === reassignChange.segmentId
          );

          if (existingIndex !== -1) {
            // Update existing reassignment to new target
            const newChange: PendingChange = {
              ...change,
              id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              timestamp: Date.now(),
            } as PendingChange;
            const updated = [...prev];
            updated[existingIndex] = newChange;
            return updated;
          }
        }

        // For time-shift: Check if segment already has a time-shift change
        if (change.type === "time-shift") {
          const timeShiftChange = change as Omit<PendingTimeShiftChange, "id" | "timestamp">;
          const existingIndex = prev.findIndex(
            (c) => c.type === "time-shift" &&
                   (c as PendingTimeShiftChange).segmentId === timeShiftChange.segmentId
          );

          if (existingIndex !== -1) {
            // Update existing time-shift to new time
            const newChange: PendingChange = {
              ...change,
              id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              timestamp: Date.now(),
            } as PendingChange;
            const updated = [...prev];
            updated[existingIndex] = newChange;
            return updated;
          }
        }

        // Add new change
        const newChange: PendingChange = {
          ...change,
          id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
        } as PendingChange;

        return [...prev, newChange];
      });
    },
    [pushToUndoStack]
  );

  const removePendingChange = useCallback(
    (id: string) => {
      setPendingChanges((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (filtered.length !== prev.length) {
          // Only push to undo stack if something was actually removed
          pushToUndoStack(prev);
        }
        return filtered;
      });
    },
    [pushToUndoStack]
  );

  const clearPendingChanges = useCallback(() => {
    setPendingChanges((prev) => {
      if (prev.length > 0) {
        pushToUndoStack(prev);
      }
      return [];
    });
  }, [pushToUndoStack]);

  // Undo: restore previous state
  const undo = useCallback(() => {
    if (undoStack.length === 0) {
      toast.info("Nothing to undo");
      return;
    }

    isUndoRedoOperation.current = true;

    setUndoStack((prevUndo) => {
      const newUndo = [...prevUndo];
      const previousState = newUndo.pop();

      if (previousState !== undefined) {
        // Push current state to redo stack
        setRedoStack((prevRedo) => [...prevRedo, pendingChanges]);
        // Restore previous state
        setPendingChanges(previousState);
        toast.info("Change undone", { duration: 1500 });
      }

      return newUndo;
    });

    // Reset flag after state updates
    setTimeout(() => {
      isUndoRedoOperation.current = false;
    }, 0);
  }, [undoStack.length, pendingChanges]);

  // Redo: restore next state
  const redo = useCallback(() => {
    if (redoStack.length === 0) {
      toast.info("Nothing to redo");
      return;
    }

    isUndoRedoOperation.current = true;

    setRedoStack((prevRedo) => {
      const newRedo = [...prevRedo];
      const nextState = newRedo.pop();

      if (nextState !== undefined) {
        // Push current state to undo stack
        setUndoStack((prevUndo) => [...prevUndo, pendingChanges]);
        // Restore next state
        setPendingChanges(nextState);
        toast.info("Change redone", { duration: 1500 });
      }

      return newRedo;
    });

    // Reset flag after state updates
    setTimeout(() => {
      isUndoRedoOperation.current = false;
    }, 0);
  }, [redoStack.length, pendingChanges]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    if (!isAdjustMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          // Cmd/Ctrl + Shift + Z = Redo
          redo();
        } else {
          // Cmd/Ctrl + Z = Undo
          undo();
        }
      }
      // Also support Cmd/Ctrl + Y for redo (Windows convention)
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdjustMode, undo, redo]);

  // Legacy method - keep for backwards compatibility
  const undoLastChange = useCallback(() => {
    undo();
  }, [undo]);

  // Check if a specific booking is already in pending changes
  const isBookingPendingAssignment = useCallback(
    (bookingId: string): boolean => {
      return pendingChanges.some(
        (c) => c.type === "assign" && (c as PendingAssignChange).bookingId === bookingId
      );
    },
    [pendingChanges]
  );

  // Get all booking IDs that have pending assignments (for hopper filtering)
  const pendingAssignedBookingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const change of pendingChanges) {
      if (change.type === "assign") {
        ids.add((change as PendingAssignChange).bookingId);
      }
    }
    return ids;
  }, [pendingChanges]);

  // Get all pending time shifts
  const pendingTimeShifts = useMemo(() => {
    return pendingChanges.filter(
      (c): c is PendingTimeShiftChange => c.type === "time-shift"
    );
  }, [pendingChanges]);

  // Get pending time shift for a specific segment
  const getTimeShiftForSegment = useCallback(
    (segmentId: string): PendingTimeShiftChange | null => {
      return pendingTimeShifts.find((c) => c.segmentId === segmentId) ?? null;
    },
    [pendingTimeShifts]
  );

  // Get summary of pending changes for display in panel
  const getPendingChangesSummary = useCallback((): PendingChangesSummary => {
    const assignments: PendingChangesSummary["assignments"] = [];
    const reassignments: PendingChangesSummary["reassignments"] = [];
    const timeShifts: PendingChangesSummary["timeShifts"] = [];
    const impactByGuide = new Map<string, { guestDelta: number; guideName: string }>();

    for (const change of pendingChanges) {
      if (change.type === "assign") {
        const assign = change as PendingAssignChange;
        assignments.push({
          id: assign.id,
          customerName: assign.bookingData.customerName,
          guestCount: assign.bookingData.guestCount,
          toGuideName: assign.toGuideName,
          tourName: assign.bookingData.tourName,
          tourTime: assign.bookingData.tourTime,
          pickupZone: assign.bookingData.pickupZone
            ? { name: assign.bookingData.pickupZone.name, color: assign.bookingData.pickupZone.color }
            : null,
        });

        // Track impact on guide
        const impact = impactByGuide.get(assign.toGuideId) || { guestDelta: 0, guideName: assign.toGuideName };
        impact.guestDelta += assign.bookingData.guestCount;
        impactByGuide.set(assign.toGuideId, impact);
      } else if (change.type === "reassign" || change.type === "swap") {
        const reassign = change as PendingReassignChange;
        reassignments.push({
          id: reassign.id,
          segmentId: reassign.segmentId,
          fromGuideId: reassign.fromGuideId,
          toGuideId: reassign.toGuideId,
          toGuideName: reassign.toGuideName,
          bookingCount: reassign.bookingIds?.length || 1,
        });
      } else if (change.type === "time-shift") {
        const timeShift = change as PendingTimeShiftChange;
        timeShifts.push({
          id: timeShift.id,
          segmentId: timeShift.segmentId,
          originalStartTime: timeShift.originalStartTime,
          newStartTime: timeShift.newStartTime,
          durationMinutes: timeShift.durationMinutes,
        });
      }
    }

    return {
      totalChanges: pendingChanges.length,
      assignments,
      reassignments,
      timeShifts,
      impactByGuide,
    };
  }, [pendingChanges]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasPendingChanges = pendingChanges.length > 0;
  const pendingChangesCount = pendingChanges.length;

  return (
    <AdjustModeContext.Provider
      value={{
        isAdjustMode,
        toggleAdjustMode,
        enterAdjustMode,
        exitAdjustMode,
        pendingChanges,
        addPendingChange,
        removePendingChange,
        clearPendingChanges,
        undo,
        redo,
        canUndo,
        canRedo,
        undoLastChange,
        hasPendingChanges,
        pendingChangesCount,
        isBookingPendingAssignment,
        pendingAssignedBookingIds,
        getPendingChangesSummary,
        getTimeShiftForSegment,
        pendingTimeShifts,
      }}
    >
      {children}
    </AdjustModeContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access adjust mode context
 * Must be used within an AdjustModeProvider
 */
export function useAdjustMode(): AdjustModeContextType {
  const context = useContext(AdjustModeContext);
  if (!context) {
    throw new Error("useAdjustMode must be used within an AdjustModeProvider");
  }
  return context;
}
