import pino from "pino";

/**
 * Structured logger for the Tour CRM application.
 *
 * Uses pino for high-performance JSON logging.
 * In development, logs are pretty-printed.
 * In production, logs are JSON for aggregation.
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
 */

const isDevelopment = process.env.NODE_ENV === "development";

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  // Add timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
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

// Create the base logger
// In development, use pino-pretty for readable output
// In production, use JSON for log aggregation
export const logger = isDevelopment
  ? pino({
      ...baseConfig,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    })
  : pino(baseConfig);

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
