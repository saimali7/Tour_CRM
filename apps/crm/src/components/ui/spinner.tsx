"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "muted";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const variantClasses = {
  default: "text-primary",
  muted: "text-muted-foreground",
};

/**
 * Standardized loading spinner component.
 * Use this instead of inline spinner implementations for consistency.
 *
 * @example
 * // Basic usage
 * <Spinner />
 *
 * // With size
 * <Spinner size="lg" />
 *
 * // Centered full-page loader
 * <PageSpinner />
 *
 * // Inline with text
 * <Spinner size="sm" className="mr-2" /> Loading...
 */
const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", variant = "default", ...props }, ref) => {
    return (
      <div ref={ref} className={cn("inline-flex", className)} {...props}>
        <Loader2
          className={cn(
            "animate-spin",
            sizeClasses[size],
            variantClasses[variant]
          )}
          aria-hidden="true"
        />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
);
Spinner.displayName = "Spinner";

/**
 * Full-page centered spinner for page loading states.
 */
function PageSpinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        "flex justify-center items-center h-64",
        className
      )}
      role="status"
      aria-label="Loading page content"
    >
      <Spinner size="lg" {...props} />
    </div>
  );
}

/**
 * Inline spinner for buttons or inline loading states.
 */
function ButtonSpinner({ className, ...props }: Omit<SpinnerProps, "size">) {
  return <Spinner size="sm" className={cn("mr-2", className)} {...props} />;
}

export { Spinner, PageSpinner, ButtonSpinner };
