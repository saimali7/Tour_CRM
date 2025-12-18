/**
 * Simple in-memory rate limiter for tRPC procedures
 *
 * For production at scale with multiple instances, upgrade to:
 * - @upstash/ratelimit with Redis
 * - Or a centralized rate limiting service
 *
 * This implementation uses a sliding window algorithm with automatic cleanup.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

// Store rate limit entries in memory
// Key format: `${identifier}:${endpoint}`
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * Check rate limit for an identifier
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(identifier);

  // No existing entry or expired - create new window
  if (!entry || entry.resetAt < now) {
    store.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetIn: config.windowMs,
    };
  }

  // Within window - check limit
  if (entry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetIn: entry.resetAt - now,
  };
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
  // Use user ID if available, otherwise fall back to a hash or IP
  const identifier = userId || orgId || "anonymous";
  return `${identifier}:${endpoint}`;
}
