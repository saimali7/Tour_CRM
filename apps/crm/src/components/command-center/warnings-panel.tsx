"use client";

import { useState, useMemo } from "react";
import {
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
  /** Externally selected warning id for context-pane linking */
  selectedWarningId?: string | null;
  /** Callback when a warning row is selected */
  onSelectWarning?: (warningId: string) => void;
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
    dotColor: "bg-warning",
    iconColor: "text-warning",
    label: "Capacity",
  },
  no_guide: {
    icon: UserX,
    dotColor: "bg-destructive",
    iconColor: "text-destructive",
    label: "No Guide",
  },
  conflict: {
    icon: AlertCircle,
    dotColor: "bg-warning",
    iconColor: "text-warning",
    label: "Conflict",
  },
  late_pickup: {
    icon: Clock,
    dotColor: "bg-warning",
    iconColor: "text-warning",
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
  isSelected: boolean;
  onToggle: () => void;
  onSelect?: () => void;
}

function CompactWarning({
  warning,
  onResolve,
  availableGuides = [],
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
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
        isSelected ? "bg-warning/10 ring-1 ring-warning/25" : isExpanded ? "bg-muted/50" : "hover:bg-muted/30"
      )}
    >
      {/* Compact header row */}
      <button
        onClick={() => {
          onToggle();
          onSelect?.();
        }}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        {/* Warning type indicator - colored dot */}
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotColor)} />

        {/* Message - truncated */}
        <span className="flex-1 truncate text-sm text-foreground">
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
        <div className="ml-5 px-3 pb-3 pt-0">
          {/* Guest info if available */}
          {warning.guestName && (
            <p className="mb-2 text-xs text-muted-foreground">
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
                className="h-6 px-2 text-[10px] gap-1 hover:bg-success hover:text-white hover:border-success"
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
  selectedWarningId?: string | null;
  onSelectWarning?: (warningId: string) => void;
  availableGuides?: WarningsPanelProps["availableGuides"];
}

function InlineWarnings({
  warnings,
  onResolve,
  selectedWarningId,
  onSelectWarning,
  availableGuides = [],
}: InlineWarningsProps) {
  const [expandedWarnings, setExpandedWarnings] = useState<Set<string>>(
    new Set()
  );
  const visibleWarnings = warnings;

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

  return (
    <div className="space-y-1">
      {visibleWarnings.slice(0, 3).map((warning) => (
        <CompactWarning
          key={warning.id}
          warning={warning}
          onResolve={(suggestionId) => onResolve(warning.id, suggestionId)}
          availableGuides={availableGuides}
          isExpanded={expandedWarnings.has(warning.id)}
          isSelected={selectedWarningId === warning.id}
          onToggle={() => toggleWarning(warning.id)}
          onSelect={() => onSelectWarning?.(warning.id)}
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
  selectedWarningId,
  onSelectWarning,
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
        selectedWarningId={selectedWarningId}
        onSelectWarning={onSelectWarning}
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
            "flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 transition-all",
            "bg-card border border-border hover:bg-muted/50",
            isOpen && "rounded-b-none border-b-transparent"
          )}
        >
          <div className="flex items-center gap-3">
            {/* Status dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
            </span>

            {/* Count and label */}
            <span className="text-base">
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
        <div className="max-h-[260px] space-y-1.5 overflow-y-auto rounded-b-lg border border-t-0 border-border bg-card px-3 py-3">
          {warnings.map((warning) => (
            <CompactWarning
              key={warning.id}
              warning={warning}
              onResolve={(suggestionId) => onResolve(warning.id, suggestionId)}
              availableGuides={availableGuides}
              isExpanded={expandedWarnings.has(warning.id)}
              isSelected={selectedWarningId === warning.id}
              onToggle={() => toggleWarning(warning.id)}
              onSelect={() => onSelectWarning?.(warning.id)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
