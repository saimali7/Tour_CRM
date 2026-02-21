"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatLocalDateKey } from "@/lib/booking-context";

export interface AvailabilityStatus {
  spotsRemaining: number;
  maxCapacity: number;
  available: boolean;
  almostFull: boolean;
  reason: string | null;
}

interface UseAvailabilityPollOptions {
  tourId: string | null;
  bookingDate: Date | null;
  bookingTime: string | null;
  /** Polling interval in milliseconds. Defaults to 30_000 (30s). */
  intervalMs?: number;
  /** Whether polling is enabled. Defaults to true. */
  enabled?: boolean;
}

const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Polls the availability of a specific tour slot at a regular interval.
 *
 * - Pauses when the tab is not visible (saves server load).
 * - Immediately re-checks when the tab becomes visible again.
 * - Stops polling when the component unmounts or `enabled` becomes false.
 */
export function useAvailabilityPoll({
  tourId,
  bookingDate,
  bookingTime,
  intervalMs = DEFAULT_INTERVAL_MS,
  enabled = true,
}: UseAvailabilityPollOptions) {
  const [status, setStatus] = useState<AvailabilityStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canPoll = Boolean(enabled && tourId && bookingDate && bookingTime);

  const fetchAvailability = useCallback(async () => {
    if (!tourId || !bookingDate || !bookingTime) return;

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsPolling(true);
      const dateKey = formatLocalDateKey(bookingDate);
      const params = new URLSearchParams({
        tourId,
        date: dateKey,
        time: bookingTime,
      });

      const response = await fetch(`/api/availability/slot?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = (await response.json()) as AvailabilityStatus;
      // Only update if this request wasn't aborted
      if (!controller.signal.aborted) {
        setStatus(data);
      }
    } catch (err: unknown) {
      // Ignore aborted requests
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Silently fail — polling is best-effort
    } finally {
      if (!controller.signal.aborted) {
        setIsPolling(false);
      }
    }
  }, [tourId, bookingDate, bookingTime]);

  // Start/stop polling
  useEffect(() => {
    if (!canPoll) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    void fetchAvailability();

    // Set up interval
    intervalRef.current = setInterval(() => {
      void fetchAvailability();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      abortRef.current?.abort();
    };
  }, [canPoll, fetchAvailability, intervalMs]);

  // Pause when tab is hidden, resume when visible
  useEffect(() => {
    if (!canPoll) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden — stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Tab visible again — immediate check + restart interval
        void fetchAvailability();
        intervalRef.current = setInterval(() => {
          void fetchAvailability();
        }, intervalMs);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [canPoll, fetchAvailability, intervalMs]);

  return { status, isPolling };
}
