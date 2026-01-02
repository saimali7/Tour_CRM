"use client";

// =============================================================================
// DATA TABLE - Composed Table Components
// =============================================================================
//
// A modular data table system built with composition pattern.
// Each component can be used independently or composed together.
//
// Structure:
// - DataTableCore.tsx    - Core table elements (Table, TableBody, TableFooter, TableCaption)
// - DataTableHeader.tsx  - Header elements with sort controls (TableHeader, TableHead)
// - DataTableRow.tsx     - Row elements with selection (TableRow, TableCell, checkboxes, actions)
// - DataTablePagination.tsx - Pagination controls
// - DataTableBulkActions.tsx - Floating bulk action bar
// - useTableSelection.ts - Selection state management hook
// - types.ts             - Shared TypeScript types
//
// =============================================================================

// Core table components
export { Table, TableBody, TableFooter, TableCaption } from "./DataTableCore";

// Header components with sorting
export { TableHeader, TableHead } from "./DataTableHeader";

// Row components with selection and actions
export {
  TableRow,
  TableCell,
  SelectAllCheckbox,
  SelectRowCheckbox,
  TableActions,
  ActionButton,
  TableRowActions,
} from "./DataTableRow";

// Pagination
export { DataTablePagination, TablePagination } from "./DataTablePagination";

// Bulk actions
export { DataTableBulkActions, BulkActionBar } from "./DataTableBulkActions";

// Selection hook
export { useTableSelection } from "./useTableSelection";

// Types
export type {
  TableProps,
  TableHeadProps,
  PaginationProps,
  ActionButtonProps,
  RowAction,
  TableActionsProps,
  TableRowActionsProps,
  SelectAllCheckboxProps,
  SelectRowCheckboxProps,
  UseTableSelectionOptions,
  UseTableSelectionReturn,
  BulkAction,
  BulkActionBarProps,
} from "./types";
