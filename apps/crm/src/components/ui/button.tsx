"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    // Base styles
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    // Focus styles (enhanced for accessibility)
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Disabled styles
    "disabled:pointer-events-none disabled:opacity-50",
    // SVG handling
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    // Transitions for micro-interactions
    "transition-all duration-150 ease-out",
    // Reduced motion support
    "motion-reduce:transition-none motion-reduce:transform-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90",
          // Micro-interaction: subtle scale on hover/active
          "hover:scale-[1.02] active:scale-[0.98]",
          // Subtle shadow on hover for depth
          "hover:shadow-md hover:shadow-primary/20",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "hover:bg-destructive/90",
          "hover:scale-[1.02] active:scale-[0.98]",
          "hover:shadow-md hover:shadow-destructive/20",
        ].join(" "),
        outline: [
          "border border-input bg-background",
          "hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20",
          "hover:scale-[1.02] active:scale-[0.98]",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80",
          "hover:scale-[1.02] active:scale-[0.98]",
        ].join(" "),
        ghost: [
          "hover:bg-accent hover:text-accent-foreground",
          "hover:scale-[1.02] active:scale-[0.98]",
        ].join(" "),
        link: [
          "text-primary underline-offset-4",
          "hover:underline",
          // No scale on link variant - feels unnatural for text links
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * When true, renders the button as a Slot component,
   * merging props onto the first child element.
   */
  asChild?: boolean;
  /**
   * When true, replaces the button content with a loading spinner
   * and disables the button. The button maintains its width.
   */
  loading?: boolean;
  /**
   * Text shown next to the spinner during loading state.
   * Defaults to "Loading..."
   */
  loadingText?: string;
  /**
   * Accessible label for icon-only buttons.
   * Required when size="icon" to ensure accessibility.
   */
  "aria-label"?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const Comp = asChild ? Slot : "button";

    // Warn in development if icon button lacks aria-label
    if (process.env.NODE_ENV === "development") {
      if (size === "icon" && !props["aria-label"]) {
        console.warn(
          "Button: Icon-only buttons should have an aria-label for accessibility."
        );
      }
    }

    // When asChild is true, don't show loading state in the button
    // as the child component handles its own content
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          // Loading state styles
          loading && "relative cursor-wait"
        )}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
            {loadingText && (
              <span className="ml-2">{loadingText}</span>
            )}
            {!loadingText && (
              <span className="sr-only">Loading</span>
            )}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

/**
 * IconButton is a convenience wrapper for icon-only buttons.
 * It enforces the aria-label requirement and applies proper styling.
 */
export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  "aria-label": string;
  size?: "sm" | "default" | "lg";
}

const iconSizes = {
  sm: "h-8 w-8",
  default: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "default", variant = "ghost", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        className={cn(
          iconSizes[size],
          "p-0",
          className
        )}
        {...props}
      />
    );
  }
);
IconButton.displayName = "IconButton";

export { Button, IconButton, buttonVariants };
