"use client";

import { useState } from "react";
import { AlertTriangle, Clock, Info, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface UrgencySectionProps {
  title: string;
  urgency: "critical" | "high" | "medium" | "low";
  count: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    loading?: boolean;
  }>;
}

const urgencyConfig = {
  critical: {
    borderColor: "border-l-red-500",
    bgColor: "bg-red-500/5 hover:bg-red-500/10",
    iconColor: "text-red-600 dark:text-red-400",
    badgeBg: "bg-red-500/10",
    badgeText: "text-red-600 dark:text-red-400",
    icon: AlertTriangle,
  },
  high: {
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-500/5 hover:bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-600 dark:text-amber-400",
    icon: Clock,
  },
  medium: {
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-500/5 hover:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-600 dark:text-blue-400",
    icon: Info,
  },
  low: {
    borderColor: "border-l-gray-400",
    bgColor: "bg-gray-500/5 hover:bg-gray-500/10",
    iconColor: "text-gray-600 dark:text-gray-400",
    badgeBg: "bg-gray-500/10",
    badgeText: "text-gray-600 dark:text-gray-400",
    icon: Info,
  },
} as const;

export function UrgencySection({
  title,
  urgency,
  count,
  defaultExpanded = true,
  children,
  actions,
}: UrgencySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const config = urgencyConfig[urgency];
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 border-l-4 transition-all duration-150",
          config.borderColor,
          config.bgColor,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-expanded={isExpanded}
        aria-controls={`urgency-section-${urgency}`}
      >
        {/* Icon */}
        <Icon className={cn("h-5 w-5 flex-shrink-0", config.iconColor)} />

        {/* Title and Count */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <Badge
            className={cn(
              "px-2 py-0.5 border-transparent",
              config.badgeBg,
              config.badgeText
            )}
          >
            {count}
          </Badge>
        </div>

        {/* Action Buttons */}
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {actions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                disabled={action.loading}
                className="h-7 px-3 text-xs"
              >
                {action.loading && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Expand/Collapse Chevron */}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
            isExpanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {/* Content */}
      <div
        id={`urgency-section-${urgency}`}
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}
