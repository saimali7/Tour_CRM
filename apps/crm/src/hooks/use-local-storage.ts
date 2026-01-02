"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * A hook for persisting state in localStorage with SSR support.
 * Handles hydration properly to avoid mismatches between server and client.
 *
 * @param key - The localStorage key
 * @param initialValue - The initial value if nothing is stored
 * @returns [value, setValue, isHydrated] - The stored value, setter function, and hydration status
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, boolean] {
  // Always start with initial value for SSR consistency
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        setStoredValue(parsed);
      }
    } catch {
      // localStorage may be unavailable or corrupted - use initial value
    }
    setIsHydrated(true);
  }, [key]);

  // Memoized setter that persists to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function for useState-like API
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch {
        // localStorage may be unavailable - silently fail
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue, isHydrated];
}

/**
 * Clear a specific key from localStorage
 */
export function clearLocalStorage(key: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(key);
  }
}
