"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SearchInput } from "./input";
import { X } from "lucide-react";

// =============================================================================
// FILTER BAR
// Standard filter bar for list pages with search and filter chips
// Following design principles: consistent filtering patterns
// =============================================================================

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// SEARCH SECTION
// Left side of filter bar with search input
// =============================================================================

interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function FilterSearch({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: FilterSearchProps) {
  return (
    <div className={cn("flex-1", className)}>
      <SearchInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClear={() => onChange("")}
        placeholder={placeholder}
      />
    </div>
  );
}

// =============================================================================
// FILTER CHIPS
// Group of toggle-able filter buttons
// =============================================================================

interface FilterChipGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function FilterChipGroup<T extends string>({
  value,
  onChange,
  options,
  className,
}: FilterChipGroupProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg transition-colors",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// FILTER ROW
// Secondary row for additional filters (like payment status)
// =============================================================================

interface FilterRowProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterRow({ label, children, className }: FilterRowProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
      {children}
    </div>
  );
}

// =============================================================================
// SMALL FILTER CHIPS
// Compact filter chips for secondary filters
// =============================================================================

interface SmallFilterChipGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function SmallFilterChipGroup<T extends string>({
  value,
  onChange,
  options,
  className,
}: SmallFilterChipGroupProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-2 py-1 text-xs rounded transition-colors",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// ACTIVE FILTERS
// Display of currently active filters with clear buttons
// =============================================================================

interface ActiveFilter {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFiltersProps {
  filters: ActiveFilter[];
  onClearAll?: () => void;
  className?: string;
}

export function ActiveFilters({
  filters,
  onClearAll,
  className,
}: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">Active filters:</span>
      {filters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
        >
          {filter.label}
          <button
            onClick={filter.onRemove}
            className="hover:text-primary/70 transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// =============================================================================
// DATE RANGE FILTER
// Date range selector for filtering by date
// =============================================================================

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  className?: string;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}: DateRangeFilterProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className={cn(
          "h-10 rounded-md border border-input bg-background px-3 py-2 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      />
      <span className="text-sm text-muted-foreground">to</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className={cn(
          "h-10 rounded-md border border-input bg-background px-3 py-2 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      />
    </div>
  );
}
