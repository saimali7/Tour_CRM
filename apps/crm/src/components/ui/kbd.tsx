"use client";

import { cn } from "@/lib/utils";

// macOS Command key symbol (⌘) as SVG - the "Place of Interest" looped square
function CommandIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-3 w-3", className)}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.5 2C2.67157 2 2 2.67157 2 3.5C2 4.32843 2.67157 5 3.5 5H5V3.5C5 2.67157 4.32843 2 3.5 2ZM6 5V3.5C6 2.11929 4.88071 1 3.5 1C2.11929 1 1 2.11929 1 3.5C1 4.88071 2.11929 6 3.5 6H5V10H3.5C2.11929 10 1 11.1193 1 12.5C1 13.8807 2.11929 15 3.5 15C4.88071 15 6 13.8807 6 12.5V11H10V12.5C10 13.8807 11.1193 15 12.5 15C13.8807 15 15 13.8807 15 12.5C15 11.1193 13.8807 10 12.5 10H11V6H12.5C13.8807 6 15 4.88071 15 3.5C15 2.11929 13.8807 1 12.5 1C11.1193 1 10 2.11929 10 3.5V5H6ZM10 6V10H6V6H10ZM11 5V3.5C11 2.67157 11.6716 2 12.5 2C13.3284 2 14 2.67157 14 3.5C14 4.32843 13.3284 5 12.5 5H11ZM5 11H3.5C2.67157 11 2 11.6716 2 12.5C2 13.3284 2.67157 14 3.5 14C4.32843 14 5 13.3284 5 12.5V11ZM11 12.5V11H12.5C13.3284 11 14 11.6716 14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface KbdProps {
  children: React.ReactNode;
  className?: string;
  showCommand?: boolean;
}

/**
 * Keyboard shortcut indicator with proper macOS command symbol
 *
 * Usage:
 * <Kbd showCommand>K</Kbd>  // Renders ⌘K with proper icon
 * <Kbd>Esc</Kbd>            // Renders just "Esc"
 */
export function Kbd({ children, className, showCommand = true }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-medium",
        className
      )}
    >
      {showCommand && <CommandIcon className="h-2.5 w-2.5 opacity-60" />}
      {children}
    </kbd>
  );
}

export { CommandIcon };
