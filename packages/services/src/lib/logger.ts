import pino from "pino";
import { getRequestContext } from "./correlation";

/**
 * Structured logger for the Tour CRM application.
 *
 * Uses pino for high-performance JSON logging.
 * In development, logs are pretty-printed.
 * In production, logs are JSON for aggregation.
 *
 * Features:
 * - Automatic correlation ID injection from AsyncLocalStorage
 * - Pretty printing in development, JSON in production
 * - Sensitive field redaction
 * - Service-specific child loggers
 *
 * Usage:
 * ```typescript
 * import { logger } from "@tour/services/lib/logger";
 *
 * // Basic logging
 * logger.info("User logged in");
 *
 * // With context
 * logger.info({ userId: "123", action: "login" }, "User logged in");
 *
 * // Create child logger with bound context
 * const bookingLogger = logger.child({ service: "booking" });
 * bookingLogger.info({ bookingId: "456" }, "Booking created");
 *
 * // Error logging
 * logger.error({ err: error, bookingId: "456" }, "Failed to create booking");
 * ```
 *
 * Correlation IDs are automatically added when running within a correlation context:
 * ```typescript
 * runWithCorrelation({ organizationId }, () => {
 *   logger.info("This log will include correlationId automatically");
 * });
 * ```
 */

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Mixin function that automatically injects correlation context into all log entries.
 * This reads from AsyncLocalStorage to get the current request context.
 */
function correlationMixin(): Record<string, unknown> {
  const ctx = getRequestContext();
  if (!ctx) {
    return {};
  }

  // Include correlation ID and optionally other context fields
  const mixinData: Record<string, unknown> = {
    correlationId: ctx.correlationId,
  };

  // Include organizationId if available (useful for multi-tenant filtering)
  if (ctx.organizationId) {
    mixinData.orgId = ctx.organizationId;
  }

  // Include userId if available (useful for audit trails)
  if (ctx.userId) {
    mixinData.userId = ctx.userId;
  }

  return mixinData;
}

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  // Add timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
  // Mixin to inject correlation context into every log entry
  mixin: correlationMixin,
  // Format errors properly
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      node_version: process.version,
    }),
  },
  // Redact sensitive fields
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "cookie",
      "secret",
      "apiKey",
      "stripeKey",
      "*.password",
      "*.token",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },
};

// Create the base logger.
//
// NOTE:
// We intentionally avoid pino transport workers (e.g. pino-pretty transport) here.
// Next.js dev server bundles server code into .next vendor chunks, and worker-based
// transport resolution can fail there with "Cannot find module .../vendor-chunks/lib/worker.js".
// Keeping logger initialization worker-free prevents dev-runtime crashes in CRM/Web.
export const logger = pino(baseConfig);

/**
 * Create a child logger with organization context
 */
export function createOrgLogger(organizationId: string) {
  return logger.child({ organizationId });
}

/**
 * Create a child logger for a specific service
 */
export function createServiceLogger(service: string, organizationId?: string) {
  return logger.child({
    service,
    ...(organizationId && { organizationId }),
  });
}

/**
 * Log levels available:
 * - trace: Very detailed debugging
 * - debug: Debugging information
 * - info: Normal operations
 * - warn: Warning conditions
 * - error: Error conditions
 * - fatal: System is unusable
 */

// Pre-configured service loggers for common use cases
export const paymentLogger = logger.child({ service: "payment" });
export const bookingLogger = logger.child({ service: "booking" });
export const webhookLogger = logger.child({ service: "webhook" });
export const authLogger = logger.child({ service: "auth" });

export default logger;
