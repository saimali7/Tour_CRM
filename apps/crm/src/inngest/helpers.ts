/**
 * Inngest Event Send Helpers
 *
 * This module provides helper utilities for sending Inngest events with
 * consistent error handling and logging. Events are fire-and-forget,
 * meaning failures are logged but don't block the calling operation.
 *
 * @example
 * ```typescript
 * import { sendEvent } from "@/inngest/helpers";
 *
 * // Send an event with automatic error handling
 * await sendEvent(
 *   { name: "booking/created", data: { bookingId: "123", ... } },
 *   { operation: "createBooking", id: bookingId }
 * );
 * ```
 */

import { inngest, type AllEvents } from "./client";
import { logger } from "@tour/services";

const inngestLogger = logger.child({ service: "inngest" });

/**
 * Context for event logging and debugging.
 */
interface EventContext {
  /** The operation that triggered this event (e.g., "createBooking") */
  operation?: string;
  /** The primary entity ID related to this event */
  id?: string;
  /** Additional metadata for logging */
  [key: string]: unknown;
}

/**
 * Valid event names from our Inngest client
 */
type ValidEventName = keyof AllEvents;

/**
 * Send an Inngest event with automatic error handling.
 *
 * This is a fire-and-forget operation - errors are logged but not thrown,
 * ensuring that event sending failures don't break the primary operation.
 *
 * @param event - The Inngest event to send (must match defined event schemas)
 * @param context - Optional context for logging and debugging
 *
 * @example
 * ```typescript
 * // Basic usage
 * await sendEvent({ name: "booking/created", data: { ... } });
 *
 * // With context for better logging
 * await sendEvent(
 *   { name: "booking/confirmed", data: { ... } },
 *   { operation: "confirmBooking", id: booking.id }
 * );
 * ```
 */
export async function sendEvent<T extends ValidEventName>(
  event: { name: T; data: AllEvents[T]["data"] },
  context?: EventContext
): Promise<void> {
  try {
    // Cast to satisfy Inngest's stricter type requirements
    await inngest.send(event as Parameters<typeof inngest.send>[0]);
    inngestLogger.debug(
      { eventName: event.name, ...context },
      "Event sent successfully"
    );
  } catch (error) {
    inngestLogger.error(
      { err: error, eventName: event.name, ...context },
      "Failed to send event"
    );
    // Don't throw - events are fire-and-forget
  }
}

/**
 * Send multiple Inngest events with automatic error handling.
 *
 * This is a fire-and-forget operation - individual failures are logged
 * but don't prevent other events from being sent.
 *
 * @param events - Array of Inngest events to send
 * @param context - Optional context for logging and debugging
 *
 * @example
 * ```typescript
 * await sendEvents([
 *   { name: "booking/confirmed", data: { bookingId: "1", ... } },
 *   { name: "booking/confirmed", data: { bookingId: "2", ... } },
 * ], { operation: "bulkConfirm" });
 * ```
 */
export async function sendEvents<T extends ValidEventName>(
  events: Array<{ name: T; data: AllEvents[T]["data"] }>,
  context?: EventContext
): Promise<void> {
  if (events.length === 0) return;

  try {
    // Cast to satisfy Inngest's stricter type requirements
    await inngest.send(events as Parameters<typeof inngest.send>[0]);
    inngestLogger.debug(
      { eventCount: events.length, eventNames: events.map((e) => e.name), ...context },
      "Events sent successfully"
    );
  } catch (error) {
    inngestLogger.error(
      { err: error, eventCount: events.length, ...context },
      "Failed to send events"
    );
    // Don't throw - events are fire-and-forget
  }
}
