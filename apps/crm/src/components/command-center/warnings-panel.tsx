"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Users,
  UserX,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { DispatchWarning, DispatchSuggestion } from "./command-center";

// =============================================================================
// TYPES
// =============================================================================

interface WarningsPanelProps {
  warnings: DispatchWarning[];
  onResolve: (warningId: string, suggestionId: string) => void;
  /** Available guides for quick-assign suggestions */
  availableGuides?: Array<{
    id: string;
    name: string;
    vehicleCapacity: number;
    currentGuests: number;
  }>;
  /** Whether to start collapsed */
  defaultCollapsed?: boolean;
  /** Compact inline mode (no outer container) */
  inline?: boolean;
}

// =============================================================================
// CONFIG
// =============================================================================

const warningTypeConfig = {
  capacity: {
    icon: Users,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    label: "Capacity",
  },
  no_guide: {
    icon: UserX,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    label: "No Guide",
  },
  conflict: {
    icon: AlertCircle,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    label: "Conflict",
  },
  late_pickup: {
    icon: Clock,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    label: "Late",
  },
};

// =============================================================================
// HELPER - Pluralize
// =============================================================================

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

// =============================================================================
// COMPACT WARNING ITEM
// =============================================================================

interface CompactWarningProps {
  warning: DispatchWarning;
  onResolve: (suggestionId: string) => void;
  availableGuides?: WarningsPanelProps["availableGuides"];
  isExpanded: boolean;
  onToggle: () => void;
}

function CompactWarning({
  warning,
  onResolve,
  availableGuides = [],
  isExpanded,
  onToggle,
}: CompactWarningProps) {
  const config = warningTypeConfig[warning.type];
  const WarningIcon = config.icon;

  // Generate quick-assign suggestions if we have available guides and no existing suggestions
  const suggestions = useMemo(() => {
    if (warning.suggestions.length > 0) return warning.suggestions;

    // Auto-generate suggestions for no_guide warnings
    if (warning.type === "no_guide" && availableGuides.length > 0) {
      const guestsNeeded = warning.guestCount || 1;

      // Filter to guides with enough remaining capacity
      const suitableGuides = availableGuides.filter(
        (guide) => guide.vehicleCapacity - guide.currentGuests >= guestsNeeded
      );

      return suitableGuides.slice(0, 3).map(
        (guide): DispatchSuggestion => ({
          id: `quick_assign_${guide.id}`,
          label: guide.name,
          description: `${guide.currentGuests}/${guide.vehicleCapacity} seats`,
          guideId: guide.id,
          impact: undefined,
        })
      );
    }

    return [];
  }, [warning, availableGuides]);

  const hasSuggestions = suggestions.length > 0;

  return (
    <div
      className={cn(
        "group rounded-md border transition-all duration-150",
        isExpanded
          ? "bg-muted/30 border-amber-500/30"
          : "bg-transparent border-transparent hover:bg-muted/20 hover:border-border"
      )}
    >
      {/* Compact header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
      >
        {/* Expand/collapse icon */}
        <span className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>

        {/* Warning type icon */}
        <div className={cn("flex-shrink-0 p-1 rounded", config.iconBg)}>
          <WarningIcon className={cn("h-3 w-3", config.iconColor)} />
        </div>

        {/* Message - truncated */}
        <span className="flex-1 text-xs text-foreground truncate">
          {warning.message}
        </span>

        {/* Guest count if available */}
        {warning.guestCount && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
            {warning.guestCount} {pluralize(warning.guestCount, "pax", "pax")}
          </Badge>
        )}

        {/* Quick action indicator */}
        {hasSuggestions && !isExpanded && (
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 shrink-0 border-primary/30 text-primary"
          >
            <Zap className="h-2.5 w-2.5 mr-0.5" />
            {suggestions.length}
          </Badge>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-2.5 pb-2.5 pt-0">
          {/* Guest info if available */}
          {warning.guestName && (
            <p className="text-[11px] text-muted-foreground mb-2 pl-6">
              {warning.guestName}
            </p>
          )}

          {/* Quick-assign suggestions */}
          {hasSuggestions ? (
            <div className="flex flex-wrap items-center gap-1.5 pl-6">
              <span className="text-[10px] text-muted-foreground mr-1">
                Quick assign:
              </span>
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve(suggestion.id);
                  }}
                  className="h-6 px-2 text-[11px] gap-1 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                >
                  <UserPlus className="h-3 w-3" />
                  {suggestion.label}
                  {suggestion.impact && (
                    <span className="text-muted-foreground ml-0.5">
                      {suggestion.impact}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground pl-6 italic">
              No quick actions. Drag from hopper to assign.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// INLINE WARNINGS (minimal footprint)
// =============================================================================

interface InlineWarningsProps {
  warnings: DispatchWarning[];
  onResolve: (warningId: string, suggestionId: string) => void;
  availableGuides?: WarningsPanelProps["availableGuides"];
}

function InlineWarnings({
  warnings,
  onResolve,
  availableGuides = [],
}: InlineWarningsProps) {
  const [expandedWarnings, setExpandedWarnings] = useState<Set<string>>(
    new Set()
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleWarnings = warnings.filter((w) => !dismissed.has(w.id));

  if (visibleWarnings.length === 0) return null;

  const toggleWarning = (id: string) => {
    setExpandedWarnings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate total guests affected
  const totalGuestsAffected = warnings.reduce(
    (sum, w) => sum + (w.guestCount || 0),
    0
  );

  return (
    <div className="space-y-1">
      {visibleWarnings.slice(0, 3).map((warning) => (
        <CompactWarning
          key={warning.id}
          warning={warning}
          onResolve={(suggestionId) => onResolve(warning.id, suggestionId)}
          availableGuides={availableGuides}
          isExpanded={expandedWarnings.has(warning.id)}
          onToggle={() => toggleWarning(warning.id)}
        />
      ))}
      {visibleWarnings.length > 3 && (
        <p className="text-[10px] text-muted-foreground text-center py-1">
          +{visibleWarnings.length - 3} more{" "}
          {pluralize(visibleWarnings.length - 3, "issue")}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// WARNINGS PANEL COMPONENT
// =============================================================================

export function WarningsPanel({
  warnings,
  onResolve,
  availableGuides = [],
  defaultCollapsed = false,
  inline = false,
}: WarningsPanelProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const [expandedWarnings, setExpandedWarnings] = useState<Set<string>>(
    new Set()
  );

  // Group warnings by type for summary
  const warningsByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const warning of warnings) {
      grouped[warning.type] = (grouped[warning.type] || 0) + 1;
    }
    return grouped;
  }, [warnings]);

  // Calculate total guests affected
  const totalGuestsAffected = useMemo(() => {
    return warnings.reduce((sum, w) => sum + (w.guestCount || 0), 0);
  }, [warnings]);

  const toggleWarning = (id: string) => {
    setExpandedWarnings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (warnings.length === 0) return null;

  // Inline mode - minimal footprint for embedding
  if (inline) {
    return (
      <InlineWarnings
        warnings={warnings}
        onResolve={onResolve}
        availableGuides={availableGuides}
      />
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {/* Collapsible Header - Always visible */}
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors",
            "bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20",
            !isOpen && "rounded-lg",
            isOpen && "rounded-t-lg rounded-b-none border-b-0"
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {warnings.length} {pluralize(warnings.length, "issue")} to resolve
            </span>

            {/* Type badges in collapsed state */}
            {!isOpen && (
              <div className="hidden sm:flex items-center gap-1.5 ml-2">
                {Object.entries(warningsByType).map(([type, count]) => {
                  const typeConfig =
                    warningTypeConfig[type as keyof typeof warningTypeConfig];
                  if (!typeConfig) return null;
                  return (
                    <Badge
                      key={type}
                      variant="outline"
                      className={cn("text-[10px] h-5 px-1.5", typeConfig.iconColor)}
                      style={{ borderColor: "currentColor" }}
                    >
                      {typeConfig.label} ({count})
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Total guests affected */}
            {totalGuestsAffected > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                <Users className="h-3 w-3 mr-1" />
                {totalGuestsAffected} {pluralize(totalGuestsAffected, "guest")}
              </Badge>
            )}

            {/* Expand/collapse icon */}
            <span className="text-amber-500">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          </div>
        </button>
      </CollapsibleTrigger>

      {/* Collapsible Content */}
      <CollapsibleContent>
        <div
          className={cn(
            "border border-t-0 border-amber-500/20 rounded-b-lg",
            "bg-amber-500/5 px-2 py-2 space-y-1",
            "max-h-[200px] overflow-y-auto"
          )}
        >
          {warnings.map((warning) => (
            <CompactWarning
              key={warning.id}
              warning={warning}
              onResolve={(suggestionId) => onResolve(warning.id, suggestionId)}
              availableGuides={availableGuides}
              isExpanded={expandedWarnings.has(warning.id)}
              onToggle={() => toggleWarning(warning.id)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
