import * as React from "react";

// =============================================================================
// TABLE PRIMITIVE TYPES
// =============================================================================

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sorted?: "asc" | "desc" | false;
  onSort?: () => void;
}

// =============================================================================
// PAGINATION TYPES
// =============================================================================

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

// =============================================================================
// ACTION TYPES
// =============================================================================

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "success" | "danger";
  tooltip?: string;
}

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

export interface TableActionsProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableRowActionsProps {
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  actions: (RowAction | "separator")[];
  className?: string;
}

// =============================================================================
// SELECTION TYPES
// =============================================================================

export interface SelectAllCheckboxProps {
  checked: boolean | "indeterminate";
  onChange: (checked: boolean) => void;
  className?: string;
}

export interface SelectRowCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export interface UseTableSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
}

export interface UseTableSelectionReturn<T> {
  selectedIds: Set<string>;
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  noneSelected: boolean;
  selectAll: () => void;
  clearSelection: () => void;
  toggleAll: () => void;
  toggleItem: (id: string) => void;
  isSelected: (id: string) => boolean;
  getSelectedItems: () => T[];
  checkboxState: boolean | "indeterminate";
}

// =============================================================================
// BULK ACTION TYPES
// =============================================================================

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  loading?: boolean;
  disabled?: boolean;
}

export interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  className?: string;
}
