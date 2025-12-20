/**
 * Optimistic Update Utilities
 *
 * Helper functions for implementing optimistic updates in tRPC mutations.
 * These utilities handle the common patterns of:
 * - Adding temporary items with optimistic markers
 * - Updating existing items optimistically
 * - Removing items from cache
 * - Rolling back on errors
 *
 * The `_optimistic` flag allows UI components to render pending items
 * with different styling (reduced opacity, shimmer, loading indicators).
 */

/**
 * Marker interface for items that are optimistically added/updated
 * and haven't been confirmed by the server yet.
 */
export interface OptimisticMarker {
  /** Indicates this item is pending server confirmation */
  _optimistic?: boolean;
  /** Temporary ID for items that don't have a server ID yet */
  _optimisticId?: string;
  /** Timestamp when the optimistic update was created */
  _optimisticTimestamp?: number;
}

/**
 * Type helper to add optimistic markers to any type
 */
export type WithOptimistic<T> = T & OptimisticMarker;

/**
 * Generates a unique optimistic ID for temporary items
 */
export function generateOptimisticId(): string {
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Creates an optimistic version of an item by adding markers
 */
export function markAsOptimistic<T extends object>(item: T): WithOptimistic<T> {
  return {
    ...item,
    _optimistic: true,
    _optimisticTimestamp: Date.now(),
  };
}

/**
 * Removes optimistic markers from an item
 */
export function clearOptimisticMarkers<T extends OptimisticMarker>(
  item: T
): Omit<T, keyof OptimisticMarker> {
  const { _optimistic, _optimisticId, _optimisticTimestamp, ...rest } = item;
  return rest as Omit<T, keyof OptimisticMarker>;
}

/**
 * Checks if an item is marked as optimistic
 */
export function isOptimistic(item: unknown): item is OptimisticMarker {
  return (
    typeof item === "object" &&
    item !== null &&
    "_optimistic" in item &&
    (item as OptimisticMarker)._optimistic === true
  );
}

// ============================================
// List Operation Helpers
// ============================================

/**
 * Adds an item optimistically to the beginning of a list
 */
export function addOptimistically<T extends { id: string }>(
  list: T[] | undefined,
  newItem: Omit<T, "id"> & Partial<Pick<T, "id">>,
  options?: {
    /** Position to insert: 'start' (default) or 'end' */
    position?: "start" | "end";
    /** Custom ID generator, defaults to generateOptimisticId */
    idGenerator?: () => string;
  }
): WithOptimistic<T>[] {
  const { position = "start", idGenerator = generateOptimisticId } =
    options ?? {};

  const optimisticItem = {
    ...newItem,
    id: newItem.id ?? idGenerator(),
    _optimistic: true,
    _optimisticId: idGenerator(),
    _optimisticTimestamp: Date.now(),
  } as WithOptimistic<T>;

  const currentList = list ?? [];

  return position === "start"
    ? [optimisticItem, ...currentList]
    : [...currentList, optimisticItem];
}

/**
 * Updates an item optimistically in a list
 */
export function updateOptimistically<T extends { id: string }>(
  list: T[] | undefined,
  id: string,
  updates: Partial<T>
): WithOptimistic<T>[] {
  if (!list) return [];

  return list.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...updates,
        _optimistic: true,
        _optimisticTimestamp: Date.now(),
      } as WithOptimistic<T>;
    }
    return item as WithOptimistic<T>;
  });
}

/**
 * Removes an item optimistically from a list
 */
export function deleteOptimistically<T extends { id: string }>(
  list: T[] | undefined,
  id: string
): T[] {
  if (!list) return [];
  return list.filter((item) => item.id !== id);
}

/**
 * Replaces an optimistic item with the real server response
 */
export function replaceOptimisticItem<T extends { id: string }>(
  list: T[] | undefined,
  optimisticId: string,
  realItem: T
): T[] {
  if (!list) return [realItem];

  return list.map((item) => {
    const itemWithMarker = item as WithOptimistic<T>;
    if (
      itemWithMarker._optimisticId === optimisticId ||
      item.id === optimisticId
    ) {
      return realItem;
    }
    return item;
  });
}

/**
 * Removes all optimistic items from a list (useful for cleanup)
 */
export function removeOptimisticItems<T>(list: T[] | undefined): T[] {
  if (!list) return [];
  return list.filter((item) => !isOptimistic(item));
}

// ============================================
// Paginated Data Helpers
// ============================================

/**
 * Standard paginated response shape used in tRPC
 */
export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Adds an item optimistically to paginated data
 */
export function addToPaginatedOptimistically<T extends { id: string }>(
  paginatedData: PaginatedData<T> | undefined,
  newItem: Omit<T, "id"> & Partial<Pick<T, "id">>,
  options?: {
    position?: "start" | "end";
    idGenerator?: () => string;
  }
): PaginatedData<WithOptimistic<T>> {
  const currentData = paginatedData ?? {
    data: [],
    total: 0,
    page: 1,
    totalPages: 1,
  };

  const updatedData = addOptimistically(currentData.data, newItem, options);

  return {
    data: updatedData,
    total: currentData.total + 1,
    page: currentData.page,
    totalPages: currentData.totalPages,
  };
}

/**
 * Updates an item optimistically in paginated data
 */
export function updateInPaginatedOptimistically<T extends { id: string }>(
  paginatedData: PaginatedData<T> | undefined,
  id: string,
  updates: Partial<T>
): PaginatedData<WithOptimistic<T>> {
  const currentData = paginatedData ?? {
    data: [],
    total: 0,
    page: 1,
    totalPages: 1,
  };

  return {
    ...currentData,
    data: updateOptimistically(currentData.data, id, updates),
  };
}

/**
 * Removes an item optimistically from paginated data
 */
export function deleteFromPaginatedOptimistically<T extends { id: string }>(
  paginatedData: PaginatedData<T> | undefined,
  id: string
): PaginatedData<T> {
  const currentData = paginatedData ?? {
    data: [],
    total: 0,
    page: 1,
    totalPages: 1,
  };

  return {
    data: deleteOptimistically(currentData.data, id),
    total: Math.max(0, currentData.total - 1),
    page: currentData.page,
    totalPages: currentData.totalPages,
  };
}

// ============================================
// Context Snapshot Helpers for Rollback
// ============================================

/**
 * Creates a snapshot of query data for rollback purposes
 */
export interface QuerySnapshot<T> {
  key: unknown;
  data: T | undefined;
  timestamp: number;
}

/**
 * Creates a context object for optimistic mutation handlers
 */
export interface OptimisticContext<T> {
  /** The previous data snapshot for rollback */
  previousData: T | undefined;
  /** Optimistic ID if a new item was created */
  optimisticId?: string;
  /** Timestamp when the optimistic update was applied */
  timestamp: number;
}

/**
 * Creates an optimistic context from current data
 */
export function createOptimisticContext<T>(
  previousData: T | undefined,
  optimisticId?: string
): OptimisticContext<T> {
  return {
    previousData,
    optimisticId,
    timestamp: Date.now(),
  };
}

// ============================================
// Status Transition Helpers
// ============================================

/**
 * Common status types used in the application
 */
export type TourStatus = "draft" | "active" | "paused" | "archived";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";
export type PaymentStatus =
  | "pending"
  | "partial"
  | "paid"
  | "refunded"
  | "failed";

/**
 * Updates status optimistically with validation
 */
export function updateStatusOptimistically<
  T extends { id: string; status: S },
  S extends string,
>(list: T[] | undefined, id: string, newStatus: S): WithOptimistic<T>[] {
  return updateOptimistically(list, id, { status: newStatus } as Partial<T>);
}

// ============================================
// Error Handling Helpers
// ============================================

/**
 * Standard error types for optimistic mutations
 */
export interface OptimisticError {
  type: "validation" | "network" | "server" | "unknown";
  message: string;
  originalError?: unknown;
}

/**
 * Parses an error into a standard format
 */
export function parseOptimisticError(error: unknown): OptimisticError {
  if (error instanceof Error) {
    // Check for network errors
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("ECONNREFUSED")
    ) {
      return {
        type: "network",
        message: "Network error. Please check your connection.",
        originalError: error,
      };
    }

    // Check for validation errors (tRPC ZodError)
    if (error.message.includes("Validation") || error.name === "ZodError") {
      return {
        type: "validation",
        message: error.message,
        originalError: error,
      };
    }

    return {
      type: "server",
      message: error.message,
      originalError: error,
    };
  }

  return {
    type: "unknown",
    message: "An unexpected error occurred",
    originalError: error,
  };
}

/**
 * Gets a user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  const parsed = parseOptimisticError(error);

  switch (parsed.type) {
    case "network":
      return "Connection failed. Changes will sync when you're back online.";
    case "validation":
      return "Invalid data. Please check your input.";
    case "server":
      return parsed.message;
    default:
      return "Something went wrong. Please try again.";
  }
}
