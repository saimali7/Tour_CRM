"use client";

import { useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  Utensils,
  Accessibility,
  MessageSquare,
  ChevronDown,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingData, BookingParticipant } from "./types";

interface OperationsAlertBarProps {
  booking: BookingData;
  className?: string;
}

interface AlertItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
  count: number;
  priority: "high" | "medium";
  items: { name: string; value: string }[];
}

/**
 * Operations Alert Bar
 *
 * A prominent, expandable alert bar that surfaces critical operational
 * information that tour operators MUST NOT OVERLOOK:
 * - Dietary requirements
 * - Accessibility needs
 * - Special requests
 *
 * Design: High contrast amber/warning colors with clear iconography.
 * Now expandable to show full details per participant.
 * Only renders if there are actual requirements to show.
 */
export function OperationsAlertBar({ booking, className }: OperationsAlertBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  const alerts: AlertItem[] = [];

  // Collect dietary requirements from booking and participants
  const dietaryItems: { name: string; value: string }[] = [];
  if (booking.dietaryRequirements) {
    dietaryItems.push({ name: "Booking", value: booking.dietaryRequirements });
  }
  booking.participants?.forEach((p: BookingParticipant) => {
    if (p.dietaryRequirements) {
      dietaryItems.push({
        name: `${p.firstName} ${p.lastName}`,
        value: p.dietaryRequirements
      });
    }
  });
  if (dietaryItems.length > 0) {
    alerts.push({
      icon: Utensils,
      label: "Dietary",
      detail: dietaryItems.length === 1
        ? dietaryItems[0]!.value
        : `${dietaryItems.length} requirements`,
      count: dietaryItems.length,
      priority: "high",
      items: dietaryItems,
    });
  }

  // Collect accessibility needs from booking and participants
  const accessibilityItems: { name: string; value: string }[] = [];
  if (booking.accessibilityNeeds) {
    accessibilityItems.push({ name: "Booking", value: booking.accessibilityNeeds });
  }
  booking.participants?.forEach((p: BookingParticipant) => {
    if (p.accessibilityNeeds) {
      accessibilityItems.push({
        name: `${p.firstName} ${p.lastName}`,
        value: p.accessibilityNeeds
      });
    }
  });
  if (accessibilityItems.length > 0) {
    alerts.push({
      icon: Accessibility,
      label: "Accessibility",
      detail: accessibilityItems.length === 1
        ? accessibilityItems[0]!.value
        : `${accessibilityItems.length} needs`,
      count: accessibilityItems.length,
      priority: "high",
      items: accessibilityItems,
    });
  }

  // Special requests
  if (booking.specialRequests) {
    alerts.push({
      icon: MessageSquare,
      label: "Request",
      detail: booking.specialRequests.length > 50
        ? booking.specialRequests.substring(0, 50) + "..."
        : booking.specialRequests,
      count: 1,
      priority: "medium",
      items: [{ name: "Special Request", value: booking.specialRequests }],
    });
  }

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [alerts, isExpanded]);

  // Don't render if no alerts or dismissed
  if (alerts.length === 0 || isDismissed) {
    return null;
  }

  const hasHighPriority = alerts.some(a => a.priority === "high");
  const hasMultipleItems = alerts.some(a => a.count > 1) || alerts.length > 1;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 transition-all duration-300",
        hasHighPriority
          ? "border-warning/60 bg-warning/10"
          : "border-info/60 bg-info/10",
        className
      )}
    >
      {/* Subtle animated background for high priority */}
      {hasHighPriority && (
        <div
          className={cn(
            "absolute inset-0 pointer-events-none",
            "bg-gradient-to-r from-warning/5 via-warning/10 to-warning/5",
            "animate-pulse-slow"
          )}
        />
      )}

      {/* Header / Summary - Always visible */}
      <button
        type="button"
        onClick={() => hasMultipleItems && setIsExpanded(!isExpanded)}
        className={cn(
          "relative flex items-start gap-3 p-3 pr-12 sm:p-4 sm:pr-14 w-full text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
          hasHighPriority
            ? "focus-visible:ring-warning/40"
            : "focus-visible:ring-info/40",
          hasMultipleItems && "cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
        )}
        aria-expanded={isExpanded}
        disabled={!hasMultipleItems}
      >
        {/* Alert Icon with circular background */}
        <div className={cn(
          "flex-shrink-0 p-2.5 rounded-full shadow-sm",
          hasHighPriority
            ? "bg-warning text-warning-foreground"
            : "bg-info text-info-foreground"
        )}>
          <AlertTriangle className="h-4 w-4" />
        </div>

        {/* Alert Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-xs font-bold uppercase tracking-wider",
              hasHighPriority
                ? "text-warning"
                : "text-info"
            )}>
              Operations Alert
            </p>
            {hasMultipleItems && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-300 ease-out",
                  hasHighPriority
                    ? "text-warning"
                    : "text-info",
                  isExpanded && "rotate-180"
                )}
              />
            )}
          </div>

          {/* Alert Summary Items */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1.5">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  alert.priority === "high"
                    ? "text-warning font-medium"
                    : "text-info"
                )}
              >
                {/* Icon with circular background */}
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full",
                  alert.priority === "high"
                    ? "bg-warning/20 text-warning"
                    : "bg-info/20 text-info"
                )}>
                  <alert.icon className="h-3.5 w-3.5 flex-shrink-0" />
                </div>
                <span className="font-semibold">{alert.label}</span>
                {alert.count > 1 && (
                  <span className={cn(
                    "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                    alert.priority === "high"
                      ? "bg-warning text-warning-foreground"
                      : "bg-info text-info-foreground"
                  )}>
                    {alert.count}
                  </span>
                )}
                <span className={cn(
                  "truncate",
                  isExpanded && "hidden sm:inline"
                )}>
                  {!isExpanded && alert.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

      </button>

      {/* Dismiss button (optional - session only) */}
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className={cn(
          "absolute right-3 top-3 z-10 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:bg-black/5 dark:hover:bg-white/10",
          "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2",
          hasHighPriority
            ? "text-warning focus-visible:ring-warning/40"
            : "text-info focus-visible:ring-info/40"
        )}
        aria-label="Dismiss alert for this session"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Expanded Content */}
      {hasMultipleItems && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out",
            isExpanded ? "opacity-100" : "opacity-0"
          )}
          style={{
            maxHeight: isExpanded ? `${contentHeight}px` : "0px",
          }}
        >
          <div
            ref={contentRef}
            className={cn(
              "border-t px-4 py-3 sm:px-5 sm:py-4",
              hasHighPriority
                ? "border-warning/40 bg-warning/10"
                : "border-info/40 bg-info/10"
            )}
          >
            <div className="space-y-4">
              {alerts.map((alert, alertIndex) => (
                <div key={alertIndex}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-full",
                      alert.priority === "high"
                        ? "bg-warning"
                        : "bg-info"
                    )}>
                      <alert.icon
                        className={cn(
                          "h-3 w-3",
                          alert.priority === "high" ? "text-warning-foreground" : "text-info-foreground"
                        )}
                      />
                    </div>
                    <h4 className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      alert.priority === "high"
                        ? "text-warning"
                        : "text-info"
                    )}>
                      {alert.label === "Dietary" && "Dietary Requirements"}
                      {alert.label === "Accessibility" && "Accessibility Needs"}
                      {alert.label === "Request" && "Special Requests"}
                    </h4>
                  </div>

                  {/* List of items */}
                  <ul className="space-y-1.5 ml-7">
                    {alert.items.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className={cn(
                          "flex items-start gap-2 text-sm",
                          alert.priority === "high"
                            ? "text-warning"
                            : "text-info"
                        )}
                      >
                        <span className={cn(
                          "inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                          alert.priority === "high"
                            ? "bg-warning"
                            : "bg-info"
                        )} />
                        <span>
                          <span className="font-medium">{item.name}:</span>{" "}
                          <span className="opacity-90">{item.value}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
