"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSessionTimeoutOptions {
  /** Warning after this many ms of inactivity. Default: 25 min. */
  warningAfterMs?: number;
  /** Expire after this many ms of inactivity. Default: 30 min. */
  expireAfterMs?: number;
  /** Whether timeout tracking is enabled. */
  enabled?: boolean;
  /** Called when the session expires. */
  onExpire?: () => void;
}

const DEFAULT_WARNING_MS = 25 * 60 * 1000; // 25 minutes
const DEFAULT_EXPIRE_MS = 30 * 60 * 1000; // 30 minutes

const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
];

/**
 * Tracks user inactivity during the checkout flow.
 *
 * Returns:
 * - `showWarning`: true when the warning threshold is reached
 * - `isExpired`: true when the expiry threshold is reached
 * - `remainingSeconds`: seconds until expiry (while warning is shown)
 * - `resetTimer`: manually resets the timer (e.g. on "Keep Booking")
 */
export function useSessionTimeout({
  warningAfterMs = DEFAULT_WARNING_MS,
  expireAfterMs = DEFAULT_EXPIRE_MS,
  enabled = true,
  onExpire,
}: UseSessionTimeoutOptions = {}) {
  const [showWarning, setShowWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warningTimerRef.current = null;
    expireTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setIsExpired(false);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      const expiresAt = lastActivityRef.current + expireAfterMs;
      setRemainingSeconds(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));

      countdownRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      }, 1000);
    }, warningAfterMs);

    expireTimerRef.current = setTimeout(() => {
      setIsExpired(true);
      setShowWarning(false);
      clearTimers();
      onExpireRef.current?.();
    }, expireAfterMs);
  }, [clearTimers, warningAfterMs, expireAfterMs]);

  const resetTimer = useCallback(() => {
    if (!enabled || isExpired) return;
    startTimers();
  }, [enabled, isExpired, startTimers]);

  // Handle user activity
  useEffect(() => {
    if (!enabled || isExpired) return;

    const handleActivity = () => {
      // Only reset if warning is not yet shown — once warning appears,
      // user must explicitly click "Keep Booking"
      if (!showWarning) {
        lastActivityRef.current = Date.now();
        startTimers();
      }
    };

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    startTimers();

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
      clearTimers();
    };
  }, [enabled, isExpired, showWarning, startTimers, clearTimers]);

  return { showWarning, isExpired, remainingSeconds, resetTimer };
}
