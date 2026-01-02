"use client";

import { AlertTriangle, Users, UserX, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DispatchWarning, DispatchSuggestion } from "./command-center";

interface WarningsPanelProps {
  warnings: DispatchWarning[];
  onResolve: (warningId: string, suggestionId: string) => void;
}

const warningTypeConfig = {
  capacity: {
    icon: Users,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  no_guide: {
    icon: UserX,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
  },
  conflict: {
    icon: AlertCircle,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  late_pickup: {
    icon: Clock,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
  },
};

interface WarningCardProps {
  warning: DispatchWarning;
  onResolve: (suggestionId: string) => void;
}

function WarningCard({ warning, onResolve }: WarningCardProps) {
  const config = warningTypeConfig[warning.type];
  const WarningIcon = config.icon;

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-amber-500/20">
      {/* Icon */}
      <div className={cn("flex-shrink-0 p-2 rounded-lg", config.iconBg)}>
        <WarningIcon className={cn("h-5 w-5", config.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Warning Message */}
        <p className="text-sm font-medium text-foreground">
          {warning.message}
        </p>

        {/* Guest Info (if available) */}
        {warning.guestName && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {warning.guestName}
            {warning.guestCount && ` (${warning.guestCount} pax)`}
          </p>
        )}

        {/* Suggestion Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {warning.suggestions.map((suggestion) => (
            <Button
              key={suggestion.id}
              variant="outline"
              size="sm"
              onClick={() => onResolve(suggestion.id)}
              className="gap-1.5 h-8 text-xs"
            >
              <span>{suggestion.label}</span>
              {suggestion.impact && (
                <span className="text-muted-foreground">{suggestion.impact}</span>
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WarningsPanel({ warnings, onResolve }: WarningsPanelProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-muted-foreground">
          {warnings.length} {warnings.length === 1 ? "issue" : "issues"} to resolve
        </span>
      </div>

      {/* Warning Cards */}
      <div className="space-y-2">
        {warnings.map((warning) => (
          <WarningCard
            key={warning.id}
            warning={warning}
            onResolve={(suggestionId) => onResolve(warning.id, suggestionId)}
          />
        ))}
      </div>
    </div>
  );
}
