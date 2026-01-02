"use client";

// =============================================================================
// DATA TABLE - Re-export from modular components
// =============================================================================
//
// This file maintains backwards compatibility by re-exporting all components
// from the new modular data-table directory structure.
//
// For new code, prefer importing directly from:
// import { Table, TableRow, ... } from "@/components/ui/data-table";
//
// =============================================================================

export {
  // Core table components
  Table,
  TableBody,
  TableFooter,
  TableCaption,
  // Header components
  TableHeader,
  TableHead,
  // Row components
  TableRow,
  TableCell,
  SelectAllCheckbox,
  SelectRowCheckbox,
  TableActions,
  ActionButton,
  TableRowActions,
  // Pagination
  DataTablePagination,
  TablePagination,
  // Bulk actions
  DataTableBulkActions,
  BulkActionBar,
  // Selection hook
  useTableSelection,
  // Types
  type TableProps,
  type TableHeadProps,
  type PaginationProps,
  type ActionButtonProps,
  type RowAction,
  type TableActionsProps,
  type TableRowActionsProps,
  type SelectAllCheckboxProps,
  type SelectRowCheckboxProps,
  type UseTableSelectionOptions,
  type UseTableSelectionReturn,
  type BulkAction,
  type BulkActionBarProps,
} from "./data-table/index";
