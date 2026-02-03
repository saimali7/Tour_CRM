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
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { DispatchWarning, DispatchSuggestion } from "./types";

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
    dotColor: "bg-amber-500",
    iconColor: "text-amber-500",
    label: "Capacity",
  },
  no_guide: {
    icon: UserX,
    dotColor: "bg-red-500",
    iconColor: "text-red-500",
    label: "No Guide",
  },
  conflict: {
    icon: AlertCircle,
    dotColor: "bg-orange-500",
    iconColor: "text-orange-500",
    label: "Conflict",
  },
  late_pickup: {
    icon: Clock,
    dotColor: "bg-yellow-500",
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
          action: "assign_guide",
        })
      );
    }

    return [];
  }, [warning, availableGuides]);

  const hasSuggestions = suggestions.length > 0;

  return (
    <div
      className={cn(
        "group rounded-md transition-all duration-150",
        isExpanded ? "bg-muted/50" : "hover:bg-muted/30"
      )}
    >
      {/* Compact header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left"
      >
        {/* Warning type indicator - colored dot */}
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotColor)} />

        {/* Message - truncated */}
        <span className="flex-1 text-xs text-foreground truncate">
          {warning.message}
        </span>

        {/* Guest count - subtle */}
        {warning.guestCount && (
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {warning.guestCount}p
          </span>
        )}

        {/* Expand indicator */}
        <ChevronRight className={cn(
          "h-3 w-3 text-muted-foreground/50 transition-transform shrink-0",
          isExpanded && "rotate-90"
        )} />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-2.5 pb-2.5 pt-0 ml-4">
          {/* Guest info if available */}
          {warning.guestName && (
            <p className="text-[11px] text-muted-foreground mb-2">
              {warning.guestName}
            </p>
          )}

          {/* Quick-assign suggestions */}
          {hasSuggestions ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve(suggestion.id);
                  }}
                  className="h-6 px-2 text-[10px] gap-1 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                >
                  <UserPlus className="h-2.5 w-2.5" />
                  {suggestion.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve("res_acknowledge");
                }}
                className="h-6 px-2 text-[10px] gap-1 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                Mark Reviewed
              </Button>
              <span className="text-[10px] text-muted-foreground/70">
                No quick fix
              </span>
            </div>
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
      {/* Collapsible Header - Clean minimal design */}
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all",
            "bg-card border border-border hover:bg-muted/50",
            isOpen && "rounded-b-none border-b-transparent"
          )}
        >
          <div className="flex items-center gap-3">
            {/* Status dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>

            {/* Count and label */}
            <span className="text-sm">
              <span className="font-semibold tabular-nums">{warnings.length}</span>
              <span className="text-muted-foreground ml-1.5">{pluralize(warnings.length, "issue")} to resolve</span>
            </span>

            {/* Type breakdown - inline, subtle */}
            {!isOpen && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-border">|</span>
                {Object.entries(warningsByType).map(([type, count], idx) => {
                  const typeConfig = warningTypeConfig[type as keyof typeof warningTypeConfig];
                  if (!typeConfig) return null;
                  return (
                    <span key={type} className="flex items-center gap-1">
                      {idx > 0 && <span className="text-border mr-2">·</span>}
                      <span className={typeConfig.iconColor}>{typeConfig.label}</span>
                      <span className="tabular-nums">({count})</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Total guests - only show if significant */}
            {totalGuestsAffected > 0 && (
              <span className="text-xs text-muted-foreground">
                <Users className="h-3 w-3 inline mr-1" />
                {totalGuestsAffected}
              </span>
            )}

            {/* Chevron */}
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </button>
      </CollapsibleTrigger>

      {/* Collapsible Content */}
      <CollapsibleContent>
        <div className="border border-t-0 border-border rounded-b-lg bg-card px-2 py-2 space-y-1 max-h-[200px] overflow-y-auto">
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
