"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isOptimistic, type OptimisticMarker } from "@/lib/optimistic";

/**
 * OptimisticItem Component
 *
 * A wrapper component that provides visual feedback for items that are
 * pending server confirmation. Use this to wrap any UI element that
 * represents an optimistically updated item.
 *
 * Visual treatments:
 * - Reduced opacity (60%)
 * - Subtle shimmer animation
 * - Optional loading spinner
 * - Disabled interactions
 *
 * Usage:
 * ```tsx
 * <OptimisticItem item={tour} showSpinner>
 *   <TourCard tour={tour} />
 * </OptimisticItem>
 * ```
 *
 * Or use the utility function:
 * ```tsx
 * <div className={cn("...", getOptimisticStyles(tour))}>
 *   ...
 * </div>
 * ```
 */

interface OptimisticItemProps {
  /** The item to check for optimistic state */
  item: unknown;
  /** Content to render */
  children: React.ReactNode;
  /** Whether to show a loading spinner overlay */
  showSpinner?: boolean;
  /** Position of the spinner */
  spinnerPosition?: "center" | "top-right" | "inline";
  /** Additional class names */
  className?: string;
  /** Whether to disable pointer events when optimistic */
  disableInteractions?: boolean;
  /** Custom message to show with spinner */
  loadingMessage?: string;
}

export function OptimisticItem({
  item,
  children,
  showSpinner = false,
  spinnerPosition = "top-right",
  className,
  disableInteractions = true,
  loadingMessage,
}: OptimisticItemProps) {
  const isOptimisticItem = isOptimistic(item);

  if (!isOptimisticItem) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "relative",
        // Optimistic styles
        "opacity-70",
        "animate-pulse",
        disableInteractions && "pointer-events-none",
        className
      )}
      aria-busy="true"
      aria-label="Saving changes..."
    >
      {children}

      {/* Loading Spinner */}
      {showSpinner && (
        <div
          className={cn(
            "absolute flex items-center gap-1.5 text-muted-foreground",
            spinnerPosition === "center" &&
              "inset-0 justify-center items-center bg-background/50",
            spinnerPosition === "top-right" && "top-2 right-2",
            spinnerPosition === "inline" && "top-1/2 right-2 -translate-y-1/2"
          )}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {loadingMessage && (
            <span className="text-xs">{loadingMessage}</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to get optimistic item state
 */
export function useOptimisticState(item: unknown): {
  isOptimistic: boolean;
  className: string;
  ariaProps: Record<string, string | boolean>;
} {
  const optimistic = isOptimistic(item);

  return {
    isOptimistic: optimistic,
    className: optimistic
      ? "opacity-70 animate-pulse pointer-events-none"
      : "",
    ariaProps: optimistic
      ? { "aria-busy": true, "aria-label": "Saving changes..." }
      : {},
  };
}

/**
 * Utility function to get optimistic styles as class names
 * Useful when you need more control over styling
 */
export function getOptimisticStyles(
  item: unknown,
  options?: {
    /** Include pointer-events-none */
    disableInteractions?: boolean;
    /** Include shimmer animation */
    animate?: boolean;
    /** Custom opacity (default: 70) */
    opacity?: 50 | 60 | 70 | 80;
  }
): string {
  if (!isOptimistic(item)) {
    return "";
  }

  const {
    disableInteractions = true,
    animate = true,
    opacity = 70,
  } = options ?? {};

  const opacityClass = `opacity-${opacity}`;

  return cn(
    opacityClass,
    animate && "animate-pulse",
    disableInteractions && "pointer-events-none"
  );
}

/**
 * CSS class for optimistic shimmer effect
 * Add this to your global CSS or use it directly
 */
export const optimisticShimmerClass = `
  relative overflow-hidden
  before:absolute before:inset-0
  before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
  before:animate-[shimmer_2s_infinite]
`;

/**
 * Conditional wrapper that only wraps if item is optimistic
 */
export function OptimisticWrapper({
  item,
  children,
  wrapper: Wrapper,
  ...wrapperProps
}: {
  item: unknown;
  children: React.ReactNode;
  wrapper: React.ComponentType<{ children: React.ReactNode }>;
  [key: string]: unknown;
}) {
  if (!isOptimistic(item)) {
    return <>{children}</>;
  }

  return <Wrapper {...wrapperProps}>{children}</Wrapper>;
}

/**
 * Row component optimized for table rows with optimistic state
 */
interface OptimisticRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  item: unknown;
  children: React.ReactNode;
}

export function OptimisticRow({
  item,
  children,
  className,
  ...props
}: OptimisticRowProps) {
  const optimistic = isOptimistic(item);

  return (
    <tr
      className={cn(
        className,
        optimistic && [
          "opacity-70",
          "animate-pulse",
          "pointer-events-none",
          "bg-muted/30",
        ]
      )}
      aria-busy={optimistic}
      {...props}
    >
      {children}
      {optimistic && (
        <td className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        </td>
      )}
    </tr>
  );
}

/**
 * Card component with optimistic state handling
 */
interface OptimisticCardProps extends React.HTMLAttributes<HTMLDivElement> {
  item: unknown;
  children: React.ReactNode;
  showSpinner?: boolean;
}

export function OptimisticCard({
  item,
  children,
  className,
  showSpinner = true,
  ...props
}: OptimisticCardProps) {
  const optimistic = isOptimistic(item);

  return (
    <div
      className={cn(
        "relative",
        className,
        optimistic && [
          "opacity-70",
          "animate-pulse",
          "pointer-events-none",
        ]
      )}
      aria-busy={optimistic}
      {...props}
    >
      {children}
      {optimistic && showSpinner && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs">Saving...</span>
        </div>
      )}
    </div>
  );
}

/**
 * List item component with optimistic state handling
 */
interface OptimisticListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  item: unknown;
  children: React.ReactNode;
}

export function OptimisticListItem({
  item,
  children,
  className,
  ...props
}: OptimisticListItemProps) {
  const optimistic = isOptimistic(item);

  return (
    <div
      className={cn(
        "relative",
        className,
        optimistic && [
          "opacity-70",
          "animate-pulse",
          "pointer-events-none",
          "bg-muted/20",
        ]
      )}
      aria-busy={optimistic}
      {...props}
    >
      {optimistic && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/50 animate-pulse" />
      )}
      {children}
    </div>
  );
}

/**
 * Badge that shows optimistic state
 */
export function OptimisticBadge({ item }: { item: unknown }) {
  if (!isOptimistic(item)) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground bg-muted rounded">
      <Loader2 className="h-2.5 w-2.5 animate-spin" />
      Saving
    </span>
  );
}
