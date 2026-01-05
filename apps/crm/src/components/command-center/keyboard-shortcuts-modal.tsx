"use client";

import { useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// SHORTCUT DATA
// =============================================================================

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["←"], description: "Previous day" },
      { keys: ["→"], description: "Next day" },
      { keys: ["T"], description: "Go to today" },
    ],
  },
  {
    title: "Edit Mode",
    shortcuts: [
      { keys: ["E"], description: "Enter edit mode" },
      { keys: ["Esc"], description: "Exit edit mode" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
];

// =============================================================================
// KBD COMPONENT
// =============================================================================

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center",
        "min-w-[24px] h-6 px-1.5",
        "rounded-md border border-border/80",
        "bg-muted/50 text-foreground",
        "font-mono text-xs font-medium",
        "shadow-[0_1px_0_1px_rgba(0,0,0,0.04)]",
        "dark:shadow-[0_1px_0_1px_rgba(255,255,255,0.04)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  // Close on any key press
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (open) {
        event.preventDefault();
        onOpenChange(false);
      }
    },
    [open, onOpenChange]
  );

  useEffect(() => {
    if (open) {
      // Add a small delay so the opening key doesn't immediately close
      const timeout = setTimeout(() => {
        window.addEventListener("keydown", handleKeyDown);
      }, 100);

      return () => {
        clearTimeout(timeout);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open, handleKeyDown]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[400px] p-0 gap-0 overflow-hidden",
          "bg-card border-border/50",
          "shadow-2xl"
        )}
        hideCloseButton
        // Close on click outside
        onPointerDownOutside={() => onOpenChange(false)}
        onInteractOutside={() => onOpenChange(false)}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Keyboard Shortcuts
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Press any key to close
          </p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <Kbd key={keyIdx}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Subtle footer */}
        <div className="px-5 py-3 bg-muted/30 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground text-center">
            Click outside or press any key to dismiss
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

KeyboardShortcutsModal.displayName = "KeyboardShortcutsModal";
