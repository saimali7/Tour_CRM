import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Primary styles
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground border-border bg-transparent",

        // Semantic variants - matching UI_UX_DESIGN_PRINCIPLES.md
        success:
          "border-transparent bg-success/10 text-success",
        warning:
          "border-transparent bg-warning/10 text-warning",
        destructive:
          "border-transparent bg-destructive/10 text-destructive",
        info:
          "border-transparent bg-info/10 text-info",

        // Muted/neutral
        muted:
          "border-transparent bg-muted text-muted-foreground",

        // Status-specific (booking, payment)
        pending: "status-pending",
        confirmed: "status-confirmed",
        completed: "status-completed",
        cancelled: "status-cancelled",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
