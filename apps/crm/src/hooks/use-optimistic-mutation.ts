/**
 * useOptimisticMutation Hook
 *
 * A generic hook that wraps tRPC mutations with optimistic update logic.
 * Provides automatic cache updates, error handling with rollback, and
 * toast notifications.
 *
 * Usage:
 * ```ts
 * const createTour = useOptimisticMutation({
 *   mutation: trpc.tour.create,
 *   getQueryKey: () => [['tour', 'listWithScheduleStats']],
 *   optimisticUpdate: (variables, oldData) => {
 *     return addToPaginatedOptimistically(oldData, {
 *       ...variables,
 *       id: generateOptimisticId(),
 *       status: 'draft',
 *     });
 *   },
 *   successMessage: 'Tour created successfully',
 *   errorMessage: 'Failed to create tour',
 * });
 * ```
 */

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { UseTRPCMutationResult } from "@trpc/react-query/shared";
import {
  type OptimisticContext,
  createOptimisticContext,
  getErrorMessage,
  generateOptimisticId,
} from "@/lib/optimistic";

// ============================================
// Types
// ============================================

/**
 * Configuration for useOptimisticMutation
 */
export interface UseOptimisticMutationOptions<
  TData,
  TError,
  TVariables,
  TContext,
  TCacheData,
> {
  /**
   * The tRPC mutation hook result (e.g., trpc.tour.create.useMutation())
   * This should be called before passing to this hook
   */
  mutation: UseTRPCMutationResult<TData, TError, TVariables, TContext>;

  /**
   * Returns the query keys that should be optimistically updated.
   * Can return multiple keys to update multiple queries.
   */
  getQueryKey: (variables: TVariables) => unknown[][];

  /**
   * Transforms the cache data optimistically before the mutation completes.
   * Receives the mutation variables and the current cache data.
   * Should return the new optimistic cache data.
   */
  optimisticUpdate?: (
    variables: TVariables,
    oldData: TCacheData | undefined
  ) => TCacheData;

  /**
   * Called when the mutation is successful.
   * Can be used to update the cache with the real server response.
   */
  onSuccessUpdate?: (
    data: TData,
    variables: TVariables,
    oldData: TCacheData | undefined
  ) => TCacheData | undefined;

  /**
   * Message to show on success. Can be a string or a function.
   */
  successMessage?: string | ((data: TData, variables: TVariables) => string);

  /**
   * Message to show on error. Can be a string or a function.
   */
  errorMessage?: string | ((error: TError, variables: TVariables) => string);

  /**
   * Whether to show toast notifications. Defaults to true.
   */
  showToasts?: boolean;

  /**
   * Called after successful mutation (after cache is updated)
   */
  onSuccess?: (data: TData, variables: TVariables) => void;

  /**
   * Called after failed mutation (after rollback)
   */
  onError?: (error: TError, variables: TVariables) => void;

  /**
   * Called when mutation starts (before optimistic update)
   */
  onMutate?: (variables: TVariables) => void;

  /**
   * Called when mutation settles (success or error)
   */
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables
  ) => void;
}

/**
 * Return type for useOptimisticMutation
 */
export interface UseOptimisticMutationResult<TData, TError, TVariables> {
  /** Execute the mutation with optimistic updates */
  mutate: (variables: TVariables) => void;

  /** Execute the mutation and return a promise */
  mutateAsync: (variables: TVariables) => Promise<TData>;

  /** Whether the mutation is currently in progress */
  isPending: boolean;

  /** Whether the mutation failed */
  isError: boolean;

  /** Whether the mutation succeeded */
  isSuccess: boolean;

  /** The error if the mutation failed */
  error: TError | null;

  /** The data returned by the mutation */
  data: TData | undefined;

  /** Reset the mutation state */
  reset: () => void;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * A wrapper hook that adds optimistic update capabilities to tRPC mutations.
 * Handles cache updates, rollback on error, and toast notifications.
 */
export function useOptimisticMutation<
  TData,
  TError extends Error,
  TVariables,
  TContext,
  TCacheData = unknown,
>(
  options: UseOptimisticMutationOptions<
    TData,
    TError,
    TVariables,
    TContext,
    TCacheData
  >
): UseOptimisticMutationResult<TData, TError, TVariables> {
  const {
    mutation,
    getQueryKey,
    optimisticUpdate,
    onSuccessUpdate,
    successMessage,
    errorMessage,
    showToasts = true,
    onSuccess,
    onError,
    onMutate,
    onSettled,
  } = options;

  const queryClient = useQueryClient();

  // Store previous data for rollback
  const contextRef = useRef<Map<string, OptimisticContext<TCacheData>>>(
    new Map()
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      // Notify caller
      onMutate?.(variables);

      // Get query keys to update
      const queryKeys = getQueryKey(variables);

      // Cancel any outgoing refetches and save previous data
      queryKeys.forEach((key) => {
        queryClient.cancelQueries({ queryKey: key });

        const previousData = queryClient.getQueryData<TCacheData>(key);
        const keyString = JSON.stringify(key);

        contextRef.current.set(
          keyString,
          createOptimisticContext(previousData)
        );

        // Apply optimistic update if provided
        if (optimisticUpdate) {
          const newData = optimisticUpdate(variables, previousData);
          queryClient.setQueryData<TCacheData>(key, newData);
        }
      });

      // Execute the mutation
      mutation.mutate(variables, {
        onSuccess: (data) => {
          // Update cache with real data if handler provided
          if (onSuccessUpdate) {
            queryKeys.forEach((key) => {
              const keyString = JSON.stringify(key);
              const context = contextRef.current.get(keyString);
              const newData = onSuccessUpdate(
                data,
                variables,
                context?.previousData
              );
              if (newData !== undefined) {
                queryClient.setQueryData<TCacheData>(key, newData);
              }
            });
          }

          // Invalidate to ensure fresh data
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });

          // Show success toast
          if (showToasts && successMessage) {
            const message =
              typeof successMessage === "function"
                ? successMessage(data, variables)
                : successMessage;
            toast.success(message);
          }

          // Notify caller
          onSuccess?.(data, variables);
          onSettled?.(data, null, variables);

          // Clear context
          contextRef.current.clear();
        },
        onError: (error) => {
          // Rollback all optimistic updates
          queryKeys.forEach((key) => {
            const keyString = JSON.stringify(key);
            const context = contextRef.current.get(keyString);
            if (context) {
              queryClient.setQueryData<TCacheData>(key, context.previousData);
            }
          });

          // Show error toast
          if (showToasts) {
            const message =
              typeof errorMessage === "function"
                ? errorMessage(error, variables)
                : errorMessage ?? getErrorMessage(error);
            toast.error(message);
          }

          // Notify caller
          onError?.(error, variables);
          onSettled?.(undefined, error, variables);

          // Clear context
          contextRef.current.clear();
        },
      });
    },
    [
      mutation,
      queryClient,
      getQueryKey,
      optimisticUpdate,
      onSuccessUpdate,
      successMessage,
      errorMessage,
      showToasts,
      onSuccess,
      onError,
      onMutate,
      onSettled,
    ]
  );

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      // Notify caller
      onMutate?.(variables);

      // Get query keys to update
      const queryKeys = getQueryKey(variables);

      // Cancel any outgoing refetches and save previous data
      queryKeys.forEach((key) => {
        queryClient.cancelQueries({ queryKey: key });

        const previousData = queryClient.getQueryData<TCacheData>(key);
        const keyString = JSON.stringify(key);

        contextRef.current.set(
          keyString,
          createOptimisticContext(previousData)
        );

        // Apply optimistic update if provided
        if (optimisticUpdate) {
          const newData = optimisticUpdate(variables, previousData);
          queryClient.setQueryData<TCacheData>(key, newData);
        }
      });

      try {
        const data = await mutation.mutateAsync(variables);

        // Update cache with real data if handler provided
        if (onSuccessUpdate) {
          queryKeys.forEach((key) => {
            const keyString = JSON.stringify(key);
            const context = contextRef.current.get(keyString);
            const newData = onSuccessUpdate(
              data,
              variables,
              context?.previousData
            );
            if (newData !== undefined) {
              queryClient.setQueryData<TCacheData>(key, newData);
            }
          });
        }

        // Invalidate to ensure fresh data
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });

        // Show success toast
        if (showToasts && successMessage) {
          const message =
            typeof successMessage === "function"
              ? successMessage(data, variables)
              : successMessage;
          toast.success(message);
        }

        // Notify caller
        onSuccess?.(data, variables);
        onSettled?.(data, null, variables);

        // Clear context
        contextRef.current.clear();

        return data;
      } catch (error) {
        // Rollback all optimistic updates
        queryKeys.forEach((key) => {
          const keyString = JSON.stringify(key);
          const context = contextRef.current.get(keyString);
          if (context) {
            queryClient.setQueryData<TCacheData>(key, context.previousData);
          }
        });

        // Show error toast
        if (showToasts) {
          const typedError = error as TError;
          const message =
            typeof errorMessage === "function"
              ? errorMessage(typedError, variables)
              : errorMessage ?? getErrorMessage(error);
          toast.error(message);
        }

        // Notify caller
        onError?.(error as TError, variables);
        onSettled?.(undefined, error as TError, variables);

        // Clear context
        contextRef.current.clear();

        throw error;
      }
    },
    [
      mutation,
      queryClient,
      getQueryKey,
      optimisticUpdate,
      onSuccessUpdate,
      successMessage,
      errorMessage,
      showToasts,
      onSuccess,
      onError,
      onMutate,
      onSettled,
    ]
  );

  return {
    mutate,
    mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

// ============================================
// Simplified Hooks for Common Patterns
// ============================================

/**
 * Options for simple delete mutations
 */
export interface UseOptimisticDeleteOptions<TVariables extends { id: string }> {
  /** The tRPC mutation to use */
  mutation: UseTRPCMutationResult<unknown, Error, TVariables, unknown>;
  /** Query keys to invalidate */
  queryKeys: unknown[][];
  /** Entity name for messages (e.g., 'tour', 'booking') */
  entityName: string;
}

/**
 * Simplified hook for delete mutations that removes items from cache
 */
export function useOptimisticDelete<TVariables extends { id: string }>(
  options: UseOptimisticDeleteOptions<TVariables>
) {
  const { mutation, queryKeys, entityName } = options;
  const queryClient = useQueryClient();

  const mutate = useCallback(
    (variables: TVariables) => {
      // Cancel queries and remove item optimistically
      queryKeys.forEach((key) => {
        queryClient.cancelQueries({ queryKey: key });
      });

      mutation.mutate(variables, {
        onSuccess: () => {
          toast.success(
            `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} deleted`
          );
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        },
        onError: (error) => {
          toast.error(`Failed to delete ${entityName}: ${error.message}`);
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        },
      });
    },
    [mutation, queryClient, queryKeys, entityName]
  );

  return {
    mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}

/**
 * Options for simple status update mutations
 */
export interface UseOptimisticStatusUpdateOptions<
  TVariables extends { id: string },
  TData,
> {
  /** The tRPC mutation to use */
  mutation: UseTRPCMutationResult<TData, Error, TVariables, unknown>;
  /** Query keys to invalidate */
  queryKeys: unknown[][];
  /** Success message */
  successMessage: string;
  /** Error message prefix */
  errorMessagePrefix: string;
}

/**
 * Simplified hook for status update mutations
 */
export function useOptimisticStatusUpdate<
  TVariables extends { id: string },
  TData,
>(options: UseOptimisticStatusUpdateOptions<TVariables, TData>) {
  const { mutation, queryKeys, successMessage, errorMessagePrefix } = options;
  const queryClient = useQueryClient();

  const mutate = useCallback(
    (variables: TVariables) => {
      queryKeys.forEach((key) => {
        queryClient.cancelQueries({ queryKey: key });
      });

      mutation.mutate(variables, {
        onSuccess: () => {
          toast.success(successMessage);
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        },
        onError: (error) => {
          toast.error(`${errorMessagePrefix}: ${error.message}`);
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        },
      });
    },
    [mutation, queryClient, queryKeys, successMessage, errorMessagePrefix]
  );

  return {
    mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}

// Re-export utilities for convenience
export { generateOptimisticId } from "@/lib/optimistic";
