"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLiveAssignment } from "./use-live-assignment";

// =============================================================================
// TYPES
// =============================================================================

type LiveAssignmentContextValue = ReturnType<typeof useLiveAssignment> | null;

// =============================================================================
// CONTEXT
// =============================================================================

const LiveAssignmentContext = createContext<LiveAssignmentContextValue>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface LiveAssignmentProviderProps {
  children: ReactNode;
  date: Date;
  onSuccess?: () => void;
}

export function LiveAssignmentProvider({
  children,
  date,
  onSuccess,
}: LiveAssignmentProviderProps) {
  const liveAssignment = useLiveAssignment({
    date,
    onSuccess,
  });

  return (
    <LiveAssignmentContext.Provider value={liveAssignment}>
      {children}
    </LiveAssignmentContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useLiveAssignmentContext() {
  const context = useContext(LiveAssignmentContext);
  if (!context) {
    throw new Error(
      "useLiveAssignmentContext must be used within a LiveAssignmentProvider"
    );
  }
  return context;
}

/**
 * Safe version that returns null if not within provider
 * Useful for components that may or may not be in live mode
 */
export function useLiveAssignmentContextSafe() {
  return useContext(LiveAssignmentContext);
}
