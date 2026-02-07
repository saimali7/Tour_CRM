"use client";

import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Clock,
  CalendarClock,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// URGENCY BADGE COMPONENT
// =============================================================================
// A sophisticated time-sensitivity indicator for tour bookings.
// Designed for high-frequency viewing (50+ times daily by operators).
//
// Design Principles:
// 1. TODAY demands attention without being alarming
// 2. Colors work in both light and dark modes
// 3. Icons provide quick visual recognition
// 4. Professional aesthetic - Linear/Notion inspired
// =============================================================================

export type UrgencyType = "today" | "tomorrow" | "soon" | "past" | "normal";

export interface UrgencyBadgeProps {
  /** The urgency level of the booking */
  type: UrgencyType;
  /** Optional custom label (defaults to type-based label) */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode - icon only with tooltip */
  compact?: boolean;
  /** Show the icon (default: true) */
  showIcon?: boolean;
}

// Configuration for each urgency level
interface UrgencyConfig {
  label: string;
  icon: LucideIcon;
  // Light mode styles
  containerLight: string;
  textLight: string;
  iconLight: string;
  // Dark mode styles
  containerDark: string;
  textDark: string;
  iconDark: string;
  // Special effects
  animate?: boolean;
}

const urgencyConfig: Record<UrgencyType, UrgencyConfig> = {
  today: {
    label: "Today",
    icon: AlertCircle,
    // Light: Warm red with subtle depth
    containerLight: "bg-destructive border-destructive/60",
    textLight: "text-destructive",
    iconLight: "text-destructive",
    // Dark: Deep red, softer for eye comfort
    containerDark: "dark:bg-destructive/40 dark:border-destructive/40",
    textDark: "dark:text-destructive",
    iconDark: "dark:text-destructive",
    animate: true,
  },
  tomorrow: {
    label: "Tomorrow",
    icon: CalendarClock,
    // Light: Warm amber
    containerLight: "bg-warning border-warning/60",
    textLight: "text-warning",
    iconLight: "text-warning",
    // Dark: Deep amber
    containerDark: "dark:bg-warning/40 dark:border-warning/40",
    textDark: "dark:text-warning",
    iconDark: "dark:text-warning",
    animate: false,
  },
  soon: {
    label: "Soon",
    icon: Clock,
    // Light: Cool blue for medium priority
    containerLight: "bg-info border-info/60",
    textLight: "text-info",
    iconLight: "text-info",
    // Dark: Deep blue
    containerDark: "dark:bg-info/40 dark:border-info/40",
    textDark: "dark:text-info",
    iconDark: "dark:text-info",
    animate: false,
  },
  past: {
    label: "Past",
    icon: CheckCircle2,
    // Light: Neutral muted
    containerLight: "bg-muted border-border",
    textLight: "text-muted-foreground",
    iconLight: "text-muted-foreground",
    // Dark: Muted gray
    containerDark: "dark:bg-muted/60 dark:border-border",
    textDark: "dark:text-muted-foreground",
    iconDark: "dark:text-muted-foreground",
    animate: false,
  },
  normal: {
    label: "",
    icon: Clock,
    containerLight: "",
    textLight: "",
    iconLight: "",
    containerDark: "",
    textDark: "",
    iconDark: "",
    animate: false,
  },
};

/**
 * UrgencyBadge
 *
 * Displays time-sensitivity for tour bookings with appropriate visual weight.
 * - TODAY: Subtle pulse animation (not annoying, but noticeable)
 * - TOMORROW: High urgency amber
 * - SOON (within 3 days): Medium priority blue
 * - PAST: Historical context, muted
 * - NORMAL (4+ days): Returns null (no badge needed)
 */
export function UrgencyBadge({
  type,
  label,
  className,
  compact = false,
  showIcon = true,
}: UrgencyBadgeProps) {
  // Normal urgency doesn't need a badge
  if (type === "normal") {
    return null;
  }

  const config = urgencyConfig[type];
  const Icon = config.icon;
  const displayLabel = label || config.label;

  // Compact mode: Icon only with tooltip
  if (compact) {
    return (
      <span
        className={cn(
          // Base styles
          "inline-flex items-center justify-center",
          "w-7 h-7 rounded-full border",
          "transition-colors duration-150",
          // Light mode
          config.containerLight,
          config.iconLight,
          // Dark mode
          config.containerDark,
          config.iconDark,
          // Animation for today
          config.animate && "urgency-pulse",
          className
        )}
        title={displayLabel}
        aria-label={displayLabel}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        // Base styles - compact, readable, professional
        "inline-flex items-center gap-1.5",
        "px-2.5 py-1 rounded-full border",
        "text-xs font-semibold uppercase tracking-wide",
        "transition-all duration-150",
        // Light mode
        config.containerLight,
        config.textLight,
        // Dark mode
        config.containerDark,
        config.textDark,
        // Animation for today
        config.animate && "urgency-pulse",
        className
      )}
    >
      {showIcon && (
        <Icon
          className={cn("h-3.5 w-3.5", config.iconLight, config.iconDark)}
          aria-hidden="true"
        />
      )}
      {displayLabel}
    </span>
  );
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate urgency level from a tour date
 */
export function calculateUrgency(tourDate: Date | string): {
  type: UrgencyType;
  label: string;
  daysUntil: number;
} {
  const date = new Date(tourDate);
  const now = new Date();

  // Reset time components for accurate day comparison
  const tourDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = tourDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { type: "past", label: "Past", daysUntil: diffDays };
  }
  if (diffDays === 0) {
    return { type: "today", label: "Today", daysUntil: 0 };
  }
  if (diffDays === 1) {
    return { type: "tomorrow", label: "Tomorrow", daysUntil: 1 };
  }
  if (diffDays <= 3) {
    return { type: "soon", label: `In ${diffDays} days`, daysUntil: diffDays };
  }

  return { type: "normal", label: `In ${diffDays} days`, daysUntil: diffDays };
}

// =============================================================================
// COMPONENT VARIANTS FOR DIFFERENT CONTEXTS
// =============================================================================

/**
 * Inline urgency indicator for table rows
 * More subtle, designed to not overwhelm data-dense views
 */
export function UrgencyIndicator({
  type,
  className,
}: {
  type: UrgencyType;
  className?: string;
}) {
  if (type === "normal") return null;

  const config = urgencyConfig[type];

  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        type === "today" && "bg-destructive dark:bg-destructive urgency-pulse-dot",
        type === "tomorrow" && "bg-warning dark:bg-warning",
        type === "soon" && "bg-info dark:bg-info",
        type === "past" && "bg-muted-foreground",
        className
      )}
      title={config.label}
      aria-label={config.label}
    />
  );
}

/**
 * Header urgency badge - larger, more prominent
 * For booking detail page headers
 */
export function UrgencyBadgeLarge({
  type,
  label,
  className,
}: {
  type: UrgencyType;
  label?: string;
  className?: string;
}) {
  if (type === "normal") return null;

  const config = urgencyConfig[type];
  const Icon = config.icon;
  const displayLabel = label || config.label;

  return (
    <span
      className={cn(
        // Larger size for header context
        "inline-flex items-center gap-2",
        "px-3.5 py-1.5 rounded-full border",
        "text-sm font-bold uppercase tracking-wide",
        "transition-all duration-150",
        // Light mode
        config.containerLight,
        config.textLight,
        // Dark mode
        config.containerDark,
        config.textDark,
        // Animation for today
        config.animate && "urgency-pulse",
        className
      )}
    >
      <Icon
        className={cn("h-4 w-4", config.iconLight, config.iconDark)}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
}

export default UrgencyBadge;
