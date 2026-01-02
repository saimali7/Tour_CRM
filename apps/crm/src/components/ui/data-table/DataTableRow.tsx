"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  SelectAllCheckboxProps,
  SelectRowCheckboxProps,
  TableActionsProps,
  ActionButtonProps,
  TableRowActionsProps,
} from "./types";

// =============================================================================
// TABLE ROW (tr element)
// =============================================================================

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border transition-colors hover:bg-muted data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

// =============================================================================
// TABLE CELL (td element)
// =============================================================================

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

// =============================================================================
// SELECTION CHECKBOXES
// =============================================================================

export function SelectAllCheckbox({ checked, onChange, className }: SelectAllCheckboxProps) {
  return (
    <Checkbox
      checked={checked === "indeterminate" ? "indeterminate" : checked}
      onCheckedChange={onChange}
      className={cn("data-[state=indeterminate]:bg-primary/50", className)}
      aria-label="Select all rows"
    />
  );
}

export function SelectRowCheckbox({ checked, onChange, className }: SelectRowCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onChange}
      className={className}
      aria-label="Select row"
    />
  );
}

// =============================================================================
// ACTION BUTTONS
// Inline action buttons for table rows
// =============================================================================

export function TableActions({ children, className }: TableActionsProps) {
  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      {children}
    </div>
  );
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className, variant = "default", tooltip, children, ...props }, ref) => {
    const variantClasses = {
      default:
        "text-muted-foreground hover:text-foreground hover:bg-accent",
      success:
        "text-emerald-500 hover:text-emerald-600 hover:bg-accent dark:text-emerald-400 dark:hover:text-emerald-300",
      danger:
        "text-destructive hover:text-destructive/80 hover:bg-accent",
    };

    const button = (
      <button
        ref={ref}
        className={cn(
          // Increased size: min-w-8 min-h-8 for 32px hit target
          "inline-flex items-center justify-center rounded-md min-w-8 min-h-8 p-2",
          "transition-all duration-150",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          variantClasses[variant],
          className
        )}
        aria-label={tooltip}
        {...props}
      >
        {children}
      </button>
    );

    // If tooltip provided, wrap in tooltip component
    if (tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  }
);
ActionButton.displayName = "ActionButton";

// =============================================================================
// ROW ACTION DROPDOWN
// Combines primary visible action with dropdown for secondary actions
// =============================================================================

export function TableRowActions({
  primaryAction,
  actions,
  className,
}: TableRowActionsProps) {
  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      {/* Primary action - always visible */}
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className={cn(
            "inline-flex items-center justify-center rounded-md p-1.5",
            "transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          title={primaryAction.label}
          aria-label={primaryAction.label}
        >
          {primaryAction.icon || <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}

      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center justify-center rounded-md p-1.5",
              "transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {actions.map((action, index) =>
            action === "separator" ? (
              <DropdownMenuSeparator key={index} />
            ) : (
              <DropdownMenuItem
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                variant={action.variant}
              >
                {action.icon && (
                  <span className="mr-2 h-4 w-4">{action.icon}</span>
                )}
                {action.label}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
