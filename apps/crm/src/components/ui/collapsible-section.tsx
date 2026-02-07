"use client";

import * as React from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// COLLAPSIBLE SECTION SYSTEM
// ============================================================================
// A high-density, action-oriented collapsible section system for booking details.
//
// Design Principles:
// 1. COLLAPSED STATE shows the most critical info in a single scannable line
// 2. EXPANSION is smooth (300ms ease-out) and reveals full detail
// 3. VISUAL FLAGS indicate "worth expanding" vs "empty/complete"
// 4. SPECIAL NEEDS auto-expand and are impossible to overlook
// 5. MOBILE-FIRST with responsive desktop layouts
// ============================================================================

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export type SectionVariant = "default" | "important" | "empty" | "success" | "warning";
export type SectionPriority = "high" | "medium" | "low";

export interface CollapsibleSectionProps {
  /** Section title displayed in header */
  title: string;
  /** Icon component to display before title */
  icon?: React.ComponentType<{ className?: string }>;
  /** Collapsed state summary - most critical info in one line */
  summary: React.ReactNode;
  /** Optional badge/count to show in header */
  badge?: React.ReactNode;
  /** Expanded content */
  children: React.ReactNode;
  /** Visual variant - affects border and indicator styling */
  variant?: SectionVariant;
  /** Priority affects default expansion and visual weight */
  priority?: SectionPriority;
  /** Force default open state (overrides priority logic) */
  defaultOpen?: boolean;
  /** Disable expansion (useful for empty states) */
  disabled?: boolean;
  /** Additional actions to show in header (buttons, links) */
  headerAction?: React.ReactNode;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Additional className for root element */
  className?: string;
  /** ID for accessibility */
  id?: string;
}

// ----------------------------------------------------------------------------
// VARIANT STYLES
// ----------------------------------------------------------------------------

const variantStyles: Record<SectionVariant, {
  border: string;
  indicator: string;
  header: string;
  iconBg: string;
}> = {
  default: {
    border: "border-border",
    indicator: "bg-muted-foreground/30",
    header: "",
    iconBg: "bg-muted",
  },
  important: {
    border: "border-warning dark:border-warning",
    indicator: "bg-warning",
    header: "bg-warning/50 dark:bg-warning/20",
    iconBg: "bg-warning dark:bg-warning/50",
  },
  empty: {
    border: "border-border",
    indicator: "bg-muted-foreground/20",
    header: "opacity-60",
    iconBg: "bg-muted/50",
  },
  success: {
    border: "border-success dark:border-success",
    indicator: "bg-success",
    header: "",
    iconBg: "bg-success dark:bg-success/50",
  },
  warning: {
    border: "border-warning dark:border-warning",
    indicator: "bg-warning",
    header: "",
    iconBg: "bg-warning dark:bg-warning/50",
  },
};

// ----------------------------------------------------------------------------
// COLLAPSIBLE SECTION COMPONENT
// ----------------------------------------------------------------------------

export function CollapsibleSection({
  title,
  icon: Icon,
  summary,
  badge,
  children,
  variant = "default",
  priority = "medium",
  defaultOpen,
  disabled = false,
  headerAction,
  onOpenChange,
  className,
  id,
}: CollapsibleSectionProps) {
  // Determine initial open state based on priority and variant
  const shouldDefaultOpen = React.useMemo(() => {
    if (defaultOpen !== undefined) return defaultOpen;
    if (variant === "important" || variant === "warning") return true;
    if (variant === "empty") return false;
    if (priority === "high") return true;
    return false;
  }, [defaultOpen, variant, priority]);

  const [isOpen, setIsOpen] = React.useState(shouldDefaultOpen);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = React.useState<number>(0);

  // Update height measurement when content changes
  React.useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, isOpen]);

  // ResizeObserver for dynamic content
  React.useEffect(() => {
    if (!contentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(entry.target.scrollHeight);
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  const handleToggle = React.useCallback(() => {
    if (disabled) return;
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  }, [disabled, isOpen, onOpenChange]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  const styles = variantStyles[variant];
  const sectionId = id || `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const headerId = `${sectionId}-header`;
  const contentId = `${sectionId}-content`;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all duration-150",
        styles.border,
        disabled && "cursor-not-allowed",
        className
      )}
      data-state={isOpen ? "open" : "closed"}
      data-variant={variant}
    >
      {/* Header - Always visible, acts as toggle */}
      <div
        id={headerId}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "group flex items-center gap-3 p-4 sm:p-5",
          "cursor-pointer select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          "transition-colors duration-150",
          !disabled && "hover:bg-muted/30",
          styles.header,
          disabled && "cursor-not-allowed"
        )}
      >
        {/* Expansion indicator - left edge accent bar */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
            isOpen ? "opacity-100" : "opacity-50",
            styles.indicator
          )}
          aria-hidden="true"
        />

        {/* Icon */}
        {Icon && (
          <div
            className={cn(
              "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
              styles.iconBg
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-colors",
                variant === "important" || variant === "warning"
                  ? "text-warning dark:text-warning"
                  : variant === "success"
                  ? "text-success dark:text-success"
                  : "text-muted-foreground"
              )}
            />
          </div>
        )}

        {/* Title + Summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              {title}
            </h3>
            {badge}
            {variant === "important" && (
              <AlertCircle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
            )}
          </div>
          <div
            className={cn(
              "mt-0.5 text-sm text-muted-foreground truncate",
              "transition-opacity duration-200",
              isOpen ? "opacity-50" : "opacity-100"
            )}
          >
            {summary}
          </div>
        </div>

        {/* Header Action (if provided) */}
        {headerAction && (
          <div
            className="flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {headerAction}
          </div>
        )}

        {/* Chevron indicator */}
        {!disabled && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground flex-shrink-0",
              "transition-transform duration-300 ease-out",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Collapsible Content */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        aria-hidden={!isOpen}
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        style={{
          maxHeight: isOpen ? `${contentHeight}px` : "0px",
        }}
      >
        <div
          ref={contentRef}
          className="border-t border-border"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SECTION CONTENT HELPERS
// ----------------------------------------------------------------------------

interface SectionContentProps {
  children: React.ReactNode;
  className?: string;
  /** Padding style - "default" has standard padding, "none" for custom layouts */
  padding?: "default" | "compact" | "none";
}

export function SectionContent({
  children,
  className,
  padding = "default",
}: SectionContentProps) {
  return (
    <div
      className={cn(
        padding === "default" && "p-4 sm:p-5",
        padding === "compact" && "p-3 sm:p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SectionListProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionList({ children, className }: SectionListProps) {
  return (
    <div className={cn("divide-y divide-border", className)}>
      {children}
    </div>
  );
}

interface SectionListItemProps {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

export function SectionListItem({
  children,
  className,
  highlight = false,
}: SectionListItemProps) {
  return (
    <div
      className={cn(
        "px-4 sm:px-5 py-3",
        highlight && "bg-warning/50 dark:bg-warning/20",
        className
      )}
    >
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------------
// EMPTY STATE FOR SECTIONS
// ----------------------------------------------------------------------------

interface SectionEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionEmptyState({
  icon: Icon,
  message,
  action,
  className,
}: SectionEmptyStateProps) {
  return (
    <div className={cn("p-8 text-center", className)}>
      <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {action}
    </div>
  );
}

// ----------------------------------------------------------------------------
// SECTION GRID FOR SIDE-BY-SIDE LAYOUT
// ----------------------------------------------------------------------------

interface SectionGridProps {
  children: React.ReactNode;
  className?: string;
  /** Number of columns on desktop (1-3) */
  columns?: 1 | 2 | 3;
}

export function SectionGrid({
  children,
  className,
  columns = 2,
}: SectionGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1",
        columns === 2 && "lg:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

// Types are already exported at their definition points above
