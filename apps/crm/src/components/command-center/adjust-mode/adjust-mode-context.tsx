"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Represents a pending guide reassignment change
 */
export interface PendingChange {
  id: string;
  type: "reassign" | "swap";
  tourRunId: string;
  segmentId: string;
  fromGuideId: string;
  toGuideId: string;
  bookingIds?: string[];
  timestamp: number;
}

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
  undoLastChange: () => void;
  /** Whether there are pending changes */
  hasPendingChanges: boolean;
  /** The count of pending changes */
  pendingChangesCount: number;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AdjustModeContext = createContext<AdjustModeContextType | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface AdjustModeProviderProps {
  children: ReactNode;
}

export function AdjustModeProvider({ children }: AdjustModeProviderProps) {
  const [isAdjustMode, setIsAdjustMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  const toggleAdjustMode = useCallback(() => {
    setIsAdjustMode((prev) => {
      if (prev) {
        // Exiting adjust mode - clear pending changes
        setPendingChanges([]);
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
    }
  }, []);

  const addPendingChange = useCallback(
    (change: Omit<PendingChange, "id" | "timestamp">) => {
      const newChange: PendingChange = {
        ...change,
        id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
      };

      setPendingChanges((prev) => {
        // Check if there's already a change for this segment
        // If so, update it instead of adding a new one
        const existingIndex = prev.findIndex(
          (c) => c.segmentId === change.segmentId
        );

        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = newChange;
          return updated;
        }

        return [...prev, newChange];
      });
    },
    []
  );

  const removePendingChange = useCallback((id: string) => {
    setPendingChanges((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearPendingChanges = useCallback(() => {
    setPendingChanges([]);
  }, []);

  const undoLastChange = useCallback(() => {
    setPendingChanges((prev) => prev.slice(0, -1));
  }, []);

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
        undoLastChange,
        hasPendingChanges,
        pendingChangesCount,
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
