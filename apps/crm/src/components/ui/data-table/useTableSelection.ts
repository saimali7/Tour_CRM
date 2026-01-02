"use client";

import * as React from "react";
import type { UseTableSelectionOptions, UseTableSelectionReturn } from "./types";

/**
 * Hook for managing table row selection state
 *
 * @example
 * ```tsx
 * const selection = useTableSelection({
 *   items: bookings,
 *   getItemId: (booking) => booking.id,
 * });
 *
 * // Use in table header
 * <SelectAllCheckbox
 *   checked={selection.checkboxState}
 *   onChange={selection.toggleAll}
 * />
 *
 * // Use in table rows
 * <SelectRowCheckbox
 *   checked={selection.isSelected(booking.id)}
 *   onChange={() => selection.toggleItem(booking.id)}
 * />
 *
 * // Use in bulk action bar
 * <DataTableBulkActions
 *   selectedCount={selection.selectedCount}
 *   onClearSelection={selection.clearSelection}
 *   actions={[...]}
 * />
 * ```
 */
export function useTableSelection<T>({
  items,
  getItemId
}: UseTableSelectionOptions<T>): UseTableSelectionReturn<T> {
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
