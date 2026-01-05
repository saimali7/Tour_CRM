"use client";

import { useContextPanel } from "@/providers/context-panel-provider";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  mobileHeader?: React.ReactNode;
}

/**
 * DashboardShell
 *
 * Client-side wrapper for the main content area that responds to context panel state.
 * Provides smooth push behavior on larger screens when the context panel is open.
 *
 * Layout behavior:
 * - Desktop (xl+): Content width adjusts (pushes) when panel opens
 * - Tablet/Mobile: Panel overlays content with backdrop
 */
export function DashboardShell({ children, mobileHeader }: DashboardShellProps) {
  const { isOpen } = useContextPanel();

  return (
    <div
      className={cn(
        "flex-1 flex flex-col overflow-hidden",
        // Smooth transition for push behavior
        "transition-[margin] duration-200 ease-out",
        // On xl screens, add right margin when panel is open
        isOpen && "xl:mr-[280px]"
      )}
    >
      {/* Mobile header slot */}
      {mobileHeader}

      {/* Page content */}
      <main
        id="main-content"
        className="flex-1 flex flex-col min-h-0 overflow-auto p-4 md:p-6 mobile-content-padding"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
