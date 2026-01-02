/**
 * Request Correlation ID Support
 *
 * Provides distributed tracing capabilities using AsyncLocalStorage
 * to propagate correlation IDs across service calls without explicit
 * parameter passing.
 *
 * Usage:
 * ```typescript
 * import { runWithCorrelation, getCorrelationId } from "@tour/services/lib/correlation";
 *
 * // Wrap your request handler
 * runWithCorrelation({ organizationId, userId }, async () => {
 *   // All code here automatically has access to the correlation context
 *   const booking = await services.booking.create(input);
 * });
 *
 * // In services, get the current correlation ID
 * const correlationId = getCorrelationId(); // Returns current or generates new
 * ```
 */

import { AsyncLocalStorage } from "async_hooks";

/**
 * Request context that's propagated through async operations
 */
export interface RequestContext {
  /** Unique identifier for tracing related operations */
  correlationId: string;
  /** Organization ID for multi-tenant isolation */
  organizationId?: string;
  /** User ID of the authenticated user */
  userId?: string;
  /** Optional request path for debugging */
  requestPath?: string;
  /** Optional timestamp when the request started */
  startedAt?: Date;
}

/**
 * AsyncLocalStorage instance for storing request context
 * This allows us to access the context anywhere in the call stack
 * without explicitly passing it through every function
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Generate a simple correlation ID
 * Uses a timestamp + random component for uniqueness
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

/**
 * Get the current correlation ID from context
 * If no context exists, generates a new correlation ID
 *
 * @returns The current correlation ID or a newly generated one
 */
export function getCorrelationId(): string {
  const store = requestContext.getStore();
  return store?.correlationId ?? generateCorrelationId();
}

/**
 * Get the full request context
 * Returns undefined if not running within a correlation context
 *
 * @returns The current request context or undefined
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/**
 * Get the organization ID from the current context
 *
 * @returns The organization ID or undefined
 */
export function getOrganizationId(): string | undefined {
  return requestContext.getStore()?.organizationId;
}

/**
 * Get the user ID from the current context
 *
 * @returns The user ID or undefined
 */
export function getUserId(): string | undefined {
  return requestContext.getStore()?.userId;
}

/**
 * Run a function within a correlation context
 *
 * This wraps the provided function in an AsyncLocalStorage context,
 * making the correlation ID and other context available to all
 * downstream calls without explicit parameter passing.
 *
 * @param context - Partial context to set (correlationId auto-generated if not provided)
 * @param fn - Function to run within the context
 * @returns The return value of the provided function
 *
 * @example
 * ```typescript
 * // In a tRPC middleware or API route
 * return runWithCorrelation(
 *   { organizationId: ctx.organizationId, userId: ctx.user?.id },
 *   () => next({ ctx })
 * );
 * ```
 */
export function runWithCorrelation<T>(
  context: Partial<RequestContext>,
  fn: () => T
): T {
  const fullContext: RequestContext = {
    correlationId: context.correlationId ?? generateCorrelationId(),
    organizationId: context.organizationId,
    userId: context.userId,
    requestPath: context.requestPath,
    startedAt: context.startedAt ?? new Date(),
  };

  return requestContext.run(fullContext, fn);
}

/**
 * Run an async function within a correlation context
 *
 * Same as runWithCorrelation but with explicit async support
 * for better TypeScript inference with async functions.
 *
 * @param context - Partial context to set
 * @param fn - Async function to run within the context
 * @returns Promise resolving to the function's return value
 */
export async function runWithCorrelationAsync<T>(
  context: Partial<RequestContext>,
  fn: () => Promise<T>
): Promise<T> {
  const fullContext: RequestContext = {
    correlationId: context.correlationId ?? generateCorrelationId(),
    organizationId: context.organizationId,
    userId: context.userId,
    requestPath: context.requestPath,
    startedAt: context.startedAt ?? new Date(),
  };

  return requestContext.run(fullContext, fn);
}
