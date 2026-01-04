"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface LiveAnnouncerContextValue {
  /**
   * Announce a message to screen readers via aria-live region
   * @param message - The message to announce
   * @param priority - "polite" waits for silence, "assertive" interrupts
   */
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

interface LiveAnnouncerProviderProps {
  children: ReactNode;
}

// =============================================================================
// CONTEXT
// =============================================================================

const LiveAnnouncerContext = createContext<LiveAnnouncerContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * Provides an aria-live region for announcing changes to screen readers
 *
 * Usage:
 * - Wrap your component tree with <LiveAnnouncerProvider>
 * - Use useLiveAnnouncer() to get the announce function
 * - Call announce("message") to announce to screen readers
 */
export function LiveAnnouncerProvider({ children }: LiveAnnouncerProviderProps) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const politeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const assertiveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    // Clear any existing timeout for this priority
    if (priority === "polite") {
      if (politeTimeoutRef.current) {
        clearTimeout(politeTimeoutRef.current);
      }
      // Clear the message first, then set it (forces re-announcement)
      setPoliteMessage("");
      // Use requestAnimationFrame to ensure the clear is processed
      requestAnimationFrame(() => {
        setPoliteMessage(message);
      });
      // Clear the message after a delay to allow new announcements
      politeTimeoutRef.current = setTimeout(() => {
        setPoliteMessage("");
      }, 1000);
    } else {
      if (assertiveTimeoutRef.current) {
        clearTimeout(assertiveTimeoutRef.current);
      }
      setAssertiveMessage("");
      requestAnimationFrame(() => {
        setAssertiveMessage(message);
      });
      assertiveTimeoutRef.current = setTimeout(() => {
        setAssertiveMessage("");
      }, 1000);
    }
  }, []);

  return (
    <LiveAnnouncerContext.Provider value={{ announce }}>
      {children}

      {/* Polite live region - waits for user to finish */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive live region - interrupts immediately */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveAnnouncerContext.Provider>
  );
}

LiveAnnouncerProvider.displayName = "LiveAnnouncerProvider";

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the live announcer for screen reader announcements
 *
 * @example
 * const { announce } = useLiveAnnouncer();
 * announce("Booking assigned to John Smith");
 * announce("Error: capacity exceeded", "assertive");
 */
export function useLiveAnnouncer(): LiveAnnouncerContextValue {
  const context = useContext(LiveAnnouncerContext);

  if (!context) {
    // Return a no-op function if used outside provider
    // This allows components to work even if announcer isn't set up
    return {
      announce: () => {
        if (process.env.NODE_ENV === "development") {
          console.warn("useLiveAnnouncer: No LiveAnnouncerProvider found in tree");
        }
      },
    };
  }

  return context;
}
