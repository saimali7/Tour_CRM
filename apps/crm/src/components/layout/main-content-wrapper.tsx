"use client";

import { useContextPanel } from "@/providers/context-panel-provider";
import { cn } from "@/lib/utils";

interface MainContentWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * MainContentWrapper
 *
 * Wraps the main content area and adjusts its width when the context panel
 * is open. This enables "push" behavior on larger screens where the panel
 * slides in and the content adjusts, rather than overlaying.
 *
 * On smaller screens (< xl), the panel overlays the content.
 */
export function MainContentWrapper({ children, className }: MainContentWrapperProps) {
  const { isOpen } = useContextPanel();

  return (
    <div
      className={cn(
        "flex-1 flex flex-col overflow-hidden transition-all duration-200 ease-out",
        // On xl screens, reduce width when panel is open to create push effect
        isOpen && "xl:mr-[280px]",
        className
      )}
    >
      {children}
    </div>
  );
}
