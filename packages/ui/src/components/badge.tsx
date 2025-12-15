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
        outline: "text-foreground border-border",

        // Semantic variants - matching UI_UX_DESIGN_PRINCIPLES.md
        success:
          "border-transparent bg-[hsl(160_84%_95%)] text-[hsl(160_84%_25%)]",
        warning:
          "border-transparent bg-[hsl(38_92%_95%)] text-[hsl(38_92%_30%)]",
        destructive:
          "border-transparent bg-[hsl(0_72%_95%)] text-[hsl(0_72%_30%)]",
        info:
          "border-transparent bg-[hsl(217_91%_95%)] text-[hsl(217_91%_30%)]",

        // Muted/neutral
        muted:
          "border-transparent bg-[hsl(220_14%_95%)] text-[hsl(220_13%_30%)]",

        // Status-specific (booking, payment)
        pending:
          "border-transparent bg-[hsl(38_92%_95%)] text-[hsl(38_92%_30%)]",
        confirmed:
          "border-transparent bg-[hsl(160_84%_95%)] text-[hsl(160_84%_25%)]",
        completed:
          "border-transparent bg-[hsl(217_91%_95%)] text-[hsl(217_91%_30%)]",
        cancelled:
          "border-transparent bg-[hsl(0_72%_95%)] text-[hsl(0_72%_30%)]",
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
