/**
 * Redis-based rate limiter for tRPC procedures
 *
 * Uses sliding window algorithm with Redis for:
 * - Persistence across restarts
 * - Shared state across multiple instances
 * - Automatic TTL-based cleanup
 *
 * Falls back to allowing requests if Redis is unavailable.
 */

import {
  getCache,
  CachePrefix,
  createServiceLogger,
} from "@tour/services";

const logger = createServiceLogger("rate-limit");

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

/**
 * Check rate limit for an identifier using Redis
 * @returns Result indicating if request is allowed
 *
 * Implementation uses Redis INCR with EXPIRE for simple fixed-window rate limiting.
 * Keys automatically expire after the window duration.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const cache = getCache();
  const key = `${CachePrefix.RATE_LIMIT}${identifier}`;
  const ttlSeconds = Math.ceil(config.windowMs / 1000);

  try {
    // Increment counter - returns current count after increment
    // If key doesn't exist, it's created with value 1
    // TTL is set on first increment (when count === 1)
    const count = await cache.increment(key, ttlSeconds);

    // If Redis returned 0, it means there was an error
    // Fall back to allowing the request
    if (count === 0) {
      logger.warn({ identifier }, "Redis increment returned 0, allowing request");
      return {
        allowed: true,
        remaining: config.limit - 1,
        resetIn: config.windowMs,
      };
    }

    const allowed = count <= config.limit;
    const remaining = Math.max(0, config.limit - count);

    // Get actual TTL for more accurate resetIn
    // Use cache's internal method to get TTL
    const resetIn = await getRemainingTTL(key, config.windowMs);

    if (!allowed) {
      logger.debug(
        { identifier, count, limit: config.limit, resetIn },
        "Rate limit exceeded"
      );
    }

    return {
      allowed,
      remaining,
      resetIn,
    };
  } catch (error) {
    // On any error, fail open - allow the request
    // This prevents Redis issues from blocking all requests
    logger.error({ err: error, identifier }, "Rate limit check failed, allowing request");
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetIn: config.windowMs,
    };
  }
}

/**
 * Get remaining TTL for a rate limit key
 * Falls back to the default window if TTL cannot be retrieved
 */
async function getRemainingTTL(key: string, defaultMs: number): Promise<number> {
  try {
    // Access the underlying Redis client through the cache service
    // We need to use PTTL (milliseconds) for more precise timing
    const cache = getCache();
    // @ts-expect-error - accessing private redis property for TTL check
    const redis = await cache.ensureConnection?.() || cache["redis"];

    if (redis) {
      const fullKey = `tour:${key}`;
      const ttl = await redis.pttl(fullKey);
      // PTTL returns -2 if key doesn't exist, -1 if no TTL set
      if (ttl > 0) {
        return ttl;
      }
    }
  } catch {
    // Ignore errors, use default
  }
  return defaultMs;
}

/**
 * Rate limit configurations for different procedure types
 */
export const RATE_LIMITS = {
  // Standard read operations - generous limit
  read: { limit: 100, windowMs: 60 * 1000 }, // 100 req/min

  // Write/mutation operations - more restrictive
  write: { limit: 30, windowMs: 60 * 1000 }, // 30 req/min

  // Sensitive operations (auth, payments) - very restrictive
  sensitive: { limit: 10, windowMs: 60 * 1000 }, // 10 req/min

  // Bulk operations - most restrictive
  bulk: { limit: 5, windowMs: 60 * 1000 }, // 5 req/min
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Create a rate limit key from user/org context
 */
export function createRateLimitKey(
  userId: string | undefined,
  orgId: string | undefined,
  endpoint: string
): string {
  // Use user ID if available, otherwise fall back to org or anonymous
  const identifier = userId || orgId || "anonymous";
  return `${identifier}:${endpoint}`;
}

/**
 * Alternative rate limiter object interface for consistency
 * Kept for backwards compatibility if needed
 */
export const rateLimiter = {
  check: checkRateLimit,
};
