"use client";

import * as React from "react";

interface UseKeyboardNavigationOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  onSelect?: (item: T) => void;
  onOpen?: (item: T) => void;
  onDelete?: (item: T) => void;
  onEdit?: (item: T) => void;
  enabled?: boolean;
}

interface UseKeyboardNavigationReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  isFocused: (index: number) => boolean;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  containerProps: {
    tabIndex: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
    role: string;
    "aria-label": string;
  };
  getRowProps: (index: number) => {
    tabIndex: number;
    "data-focused": boolean;
    "aria-selected": boolean;
    onFocus: () => void;
  };
}

export function useKeyboardNavigation<T>({
  items,
  getItemId,
  onSelect,
  onOpen,
  onDelete,
  onEdit,
  enabled = true,
}: UseKeyboardNavigationOptions<T>): UseKeyboardNavigationReturn {
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
        case "j": // vim-style
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < items.length - 1 ? prev + 1 : prev
          );
          break;

        case "ArrowUp":
        case "k": // vim-style
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;

        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;

        case "End":
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;

        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            const item = items[focusedIndex];
            if (item) onOpen?.(item);
          }
          break;

        case " ": // Space for selection
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            const item = items[focusedIndex];
            if (item) onSelect?.(item);
          }
          break;

        case "e":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < items.length) {
              const item = items[focusedIndex];
              if (item) onEdit?.(item);
            }
          }
          break;

        case "Delete":
        case "Backspace":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < items.length) {
              const item = items[focusedIndex];
              if (item) onDelete?.(item);
            }
          }
          break;

        case "Escape":
          e.preventDefault();
          setFocusedIndex(-1);
          break;
      }
    },
    [enabled, items, focusedIndex, onOpen, onSelect, onEdit, onDelete]
  );

  const isFocused = React.useCallback(
    (index: number) => focusedIndex === index,
    [focusedIndex]
  );

  const containerProps = {
    tabIndex: 0,
    onKeyDown: handleKeyDown,
    role: "grid",
    "aria-label": "Data table with keyboard navigation",
  };

  const getRowProps = React.useCallback(
    (index: number) => ({
      tabIndex: focusedIndex === index ? 0 : -1,
      "data-focused": focusedIndex === index,
      "aria-selected": focusedIndex === index,
      onFocus: () => setFocusedIndex(index),
    }),
    [focusedIndex]
  );

  // Reset focus when items change
  React.useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(items.length > 0 ? items.length - 1 : -1);
    }
  }, [items.length, focusedIndex]);

  return {
    focusedIndex,
    setFocusedIndex,
    isFocused,
    handleKeyDown,
    containerProps,
    getRowProps,
  };
}

// Hook for global keyboard shortcuts
interface UseHotkeysOptions {
  enabled?: boolean;
}

type HotkeyCallback = (e: KeyboardEvent) => void;
type HotkeyMap = Record<string, HotkeyCallback>;

export function useHotkeys(
  hotkeys: HotkeyMap,
  options: UseHotkeysOptions = {}
) {
  const { enabled = true } = options;

  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Build the key combo string
      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push("mod");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");
      parts.push(e.key.toLowerCase());
      const combo = parts.join("+");

      // Also check without mod for simple keys
      const simpleKey = e.key.toLowerCase();

      if (hotkeys[combo]) {
        e.preventDefault();
        hotkeys[combo](e);
      } else if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && hotkeys[simpleKey]) {
        e.preventDefault();
        hotkeys[simpleKey](e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hotkeys, enabled]);
}
