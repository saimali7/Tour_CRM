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
    borderColor: "border-l-destructive",
    bgColor: "bg-destructive/5 hover:bg-destructive/10",
    iconColor: "text-destructive dark:text-destructive",
    badgeBg: "bg-destructive/10",
    badgeText: "text-destructive dark:text-destructive",
    icon: AlertTriangle,
  },
  high: {
    borderColor: "border-l-warning",
    bgColor: "bg-warning/5 hover:bg-warning/10",
    iconColor: "text-warning dark:text-warning",
    badgeBg: "bg-warning/10",
    badgeText: "text-warning dark:text-warning",
    icon: Clock,
  },
  medium: {
    borderColor: "border-l-info",
    bgColor: "bg-info/5 hover:bg-info/10",
    iconColor: "text-info dark:text-info",
    badgeBg: "bg-info/10",
    badgeText: "text-info dark:text-info",
    icon: Info,
  },
  low: {
    borderColor: "border-l-muted-foreground/40",
    bgColor: "bg-muted/40 hover:bg-muted/60",
    iconColor: "text-muted-foreground",
    badgeBg: "bg-muted/60",
    badgeText: "text-muted-foreground",
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
      {/* Header Bar - div wrapper with button inside to avoid button nesting */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 border-l-4 transition-all duration-150",
          config.borderColor,
          config.bgColor
        )}
      >
        {/* Clickable expand/collapse area */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          aria-expanded={isExpanded}
          aria-controls={`urgency-section-${urgency}`}
        >
          {/* Icon */}
          <Icon className={cn("h-5 w-5 flex-shrink-0", config.iconColor)} />

          {/* Title and Count */}
          <div className="flex items-center gap-2 min-w-0">
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

          {/* Expand/Collapse Chevron */}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
              isExpanded && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>

        {/* Spacer to push action buttons to the right */}
        <div className="flex-1" />

        {/* Action Buttons - outside the button to avoid nesting */}
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="outline"
                onClick={action.onClick}
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
      </div>

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
