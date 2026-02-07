"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type BookingView = "needs-action" | "all" | "find-availability";

export interface BookingViewTabsProps {
  activeView: BookingView;
  onViewChange: (view: BookingView) => void;
  counts: {
    needsAction: number;
    upcoming: number;
    today: number;
  };
}

interface TabConfig {
  id: BookingView;
  label: string;
  shortcut: string;
}

const tabs: TabConfig[] = [
  { id: "all", label: "All Bookings", shortcut: "1" },
  { id: "needs-action", label: "Needs Action", shortcut: "2" },
  { id: "find-availability", label: "Find Availability", shortcut: "3" },
];

export function BookingViewTabs({
  activeView,
  onViewChange,
  counts,
}: BookingViewTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Keyboard shortcuts: 1-4 to switch views
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input/textarea and no modifiers
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true";

      if (isInput || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        return;
      }

      // Handle numeric keys 1-3
      const keyMap: Record<string, BookingView> = {
        "1": "all",
        "2": "needs-action",
        "3": "find-availability",
      };

      const view = keyMap[e.key];
      if (view) {
        e.preventDefault();
        handleViewChange(view);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeView, searchParams]);

  const handleViewChange = (view: BookingView) => {
    // Update URL query param
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`?${params.toString()}`, { scroll: false });

    // Call the callback
    onViewChange(view);
  };

  const getCount = (view: BookingView): number | undefined => {
    switch (view) {
      case "needs-action":
        return counts.needsAction;
      default:
        return undefined;
    }
  };

  return (
    <div className="border-b border-border">
      <nav
        className="-mb-px flex space-x-2 overflow-x-auto scrollbar-hide px-1"
        aria-label="Booking views"
      >
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          const count = getCount(tab.id);
          const hasNeedsAction = tab.id === "needs-action" && count && count > 0;

          return (
            <button
              key={tab.id}
              onClick={() => handleViewChange(tab.id)}
              className={cn(
                "group relative whitespace-nowrap py-3 px-4 text-sm font-medium transition-colors",
                "border-b-2 -mb-px",
                "hover:text-foreground hover:border-border",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-sm",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {count !== undefined && count > 0 && (
                  <Badge
                    variant={hasNeedsAction ? "warning" : "secondary"}
                    className={cn(
                      "ml-1 font-mono tabular-nums",
                      hasNeedsAction &&
                        "bg-warning/15 text-warning dark:text-warning border-warning/20"
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
