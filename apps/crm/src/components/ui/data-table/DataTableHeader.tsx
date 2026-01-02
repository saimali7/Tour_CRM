"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { TableHeadProps } from "./types";

// =============================================================================
// TABLE HEADER (thead element)
// =============================================================================

export const TableHeader = React.forwardRef<
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

// =============================================================================
// TABLE HEAD CELL (th element with optional sorting)
// =============================================================================

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
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
