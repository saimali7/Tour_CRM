"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, Eye, X, Loader2 } from "lucide-react";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================================================
// TABLE PRIMITIVES
// Following design principles: consistent borders, proper spacing, hover states
// =============================================================================

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, ...props }, ref) => (
    <div
      className={cn(
        "relative w-full overflow-auto rounded-lg border border-border bg-card",
        containerClassName
      )}
    >
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("bg-muted/50 [&_tr]:border-b", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sorted?: "asc" | "desc" | false;
  onSort?: () => void;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable, sorted, onSort, ...props }, ref) => {
    // Generate accessible label for sort button
    const getSortLabel = () => {
      const columnName = typeof children === 'string' ? children : 'column';
      if (sorted === "asc") return `Sort ${columnName} descending`;
      if (sorted === "desc") return `Clear ${columnName} sort`;
      return `Sort ${columnName} ascending`;
    };

    const content = sortable ? (
      <button
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded px-1 -ml-1"
        onClick={onSort}
        aria-label={getSortLabel()}
        aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
      >
        {children}
        {sorted === "asc" ? (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        ) : sorted === "desc" ? (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />
        )}
      </button>
    ) : (
      children
    );

    return (
      <th
        ref={ref}
        className={cn(
          "h-11 px-4 text-left align-middle font-medium text-muted-foreground",
          "text-xs uppercase tracking-wider",
          "[&:has([role=checkbox])]:pr-0",
          className
        )}
        {...props}
      >
        {content}
      </th>
    );
  }
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
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

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

// =============================================================================
// PAGINATION
// =============================================================================

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav
      className={cn(
        "flex items-center justify-between px-2 py-4",
        className
      )}
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium">{start}</span> to{" "}
        <span className="font-medium">{end}</span> of{" "}
        <span className="font-medium">{total}</span> results
      </p>
      <div className="flex items-center gap-2" role="group" aria-label="Page navigation">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Go to previous page"
          className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium",
            "h-9 px-3 border border-input bg-background",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "transition-colors"
          )}
        >
          Previous
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Show pages around current page
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }

            const isCurrent = pageNum === page;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                aria-label={`Go to page ${pageNum}`}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium",
                  "h-9 w-9",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "transition-colors",
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Go to next page"
          className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium",
            "h-9 px-3 border border-input bg-background",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "transition-colors"
          )}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

// =============================================================================
// ACTION BUTTONS
// Inline action buttons for table rows
// =============================================================================

interface TableActionsProps {
  children: React.ReactNode;
  className?: string;
}

function TableActions({ children, className }: TableActionsProps) {
  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      {children}
    </div>
  );
}

interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "success" | "danger";
  tooltip?: string;
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className, variant = "default", tooltip, children, ...props }, ref) => {
    const variantClasses = {
      default:
        "text-muted-foreground hover:text-foreground hover:bg-accent",
      success:
        "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/50",
      danger:
        "text-destructive hover:text-destructive/80 hover:bg-destructive/10",
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

interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface TableRowActionsProps {
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  actions: (RowAction | "separator")[];
  className?: string;
}

function TableRowActions({
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

// =============================================================================
// SELECTION COMPONENTS
// For batch operations with multi-select
// =============================================================================

interface SelectAllCheckboxProps {
  checked: boolean | "indeterminate";
  onChange: (checked: boolean) => void;
  className?: string;
}

function SelectAllCheckbox({ checked, onChange, className }: SelectAllCheckboxProps) {
  return (
    <Checkbox
      checked={checked === "indeterminate" ? "indeterminate" : checked}
      onCheckedChange={onChange}
      className={cn("data-[state=indeterminate]:bg-primary/50", className)}
      aria-label="Select all rows"
    />
  );
}

interface SelectRowCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

function SelectRowCheckbox({ checked, onChange, className }: SelectRowCheckboxProps) {
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
// BULK ACTION BAR
// Floating action bar that appears when items are selected
// =============================================================================

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  loading?: boolean;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  className?: string;
}

function BulkActionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  actions,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-4 py-3 rounded-xl",
        "bg-foreground text-background shadow-lg",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3 border-r border-background/20">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <button
          onClick={onClearSelection}
          className="p-1 rounded-md hover:bg-background/10 transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.loading || action.disabled}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
              "transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              action.variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-background/10 hover:bg-background/20 text-background"
            )}
          >
            {action.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              action.icon
            )}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SELECTION HOOK
// For managing multi-select state
// =============================================================================

interface UseTableSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
}

function useTableSelection<T>({ items, getItemId }: UseTableSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;
  const noneSelected = selectedIds.size === 0;

  const selectAll = React.useCallback(() => {
    setSelectedIds(new Set(items.map(getItemId)));
  }, [items, getItemId]);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = React.useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [allSelected, selectAll, clearSelection]);

  const toggleItem = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const getSelectedItems = React.useCallback(() => {
    return items.filter((item) => selectedIds.has(getItemId(item)));
  }, [items, selectedIds, getItemId]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    allSelected,
    someSelected,
    noneSelected,
    selectAll,
    clearSelection,
    toggleAll,
    toggleItem,
    isSelected,
    getSelectedItems,
    checkboxState: allSelected ? true : someSelected ? "indeterminate" as const : false,
  };
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TablePagination,
  TableActions,
  ActionButton,
  TableRowActions,
  SelectAllCheckbox,
  SelectRowCheckbox,
  BulkActionBar,
  useTableSelection,
  type RowAction,
  type BulkAction,
};
