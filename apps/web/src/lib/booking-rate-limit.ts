import type { NextRequest } from "next/server";
import { CachePrefix, createServiceLogger, getCache } from "@tour/services";

const logger = createServiceLogger("web-booking-rate-limit");

const memoryFallback = new Map<string, { count: number; resetAt: number }>();

export type BookingRateLimitScope =
  | "booking_create_ip"
  | "booking_create_customer"
  | "booking_lookup_ip"
  | "booking_lookup_customer"
  | "booking_manage_ip"
  | "booking_manage_customer"
  | "magic_request_ip"
  | "magic_request_customer"
  | "magic_verify_ip"
  | "resume_payment_ip"
  | "resume_payment_customer";

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

const LIMIT_CONFIG: Record<BookingRateLimitScope, RateLimitConfig> = {
  booking_create_ip: { limit: 12, windowMs: 60_000 },
  booking_create_customer: { limit: 6, windowMs: 10 * 60_000 },
  booking_lookup_ip: { limit: 40, windowMs: 60_000 },
  booking_lookup_customer: { limit: 20, windowMs: 10 * 60_000 },
  booking_manage_ip: { limit: 20, windowMs: 60_000 },
  booking_manage_customer: { limit: 8, windowMs: 10 * 60_000 },
  magic_request_ip: { limit: 8, windowMs: 60_000 },
  magic_request_customer: { limit: 4, windowMs: 10 * 60_000 },
  magic_verify_ip: { limit: 60, windowMs: 60_000 },
  resume_payment_ip: { limit: 16, windowMs: 60_000 },
  resume_payment_customer: { limit: 8, windowMs: 10 * 60_000 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

function nowTimestamp() {
  return Date.now();
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig,
  now: number
): RateLimitResult {
  if (memoryFallback.size > 2000) {
    for (const [storedKey, entry] of memoryFallback.entries()) {
      if (entry.resetAt <= now) {
        memoryFallback.delete(storedKey);
      }
    }
  }

  const existing = memoryFallback.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs;
    memoryFallback.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, config.limit - 1),
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil(config.windowMs / 1000)),
    };
  }

  const count = existing.count + 1;
  memoryFallback.set(key, { count, resetAt: existing.resetAt });

  return {
    allowed: count <= config.limit,
    remaining: Math.max(0, config.limit - count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export async function checkBookingRateLimit(params: {
  scope: BookingRateLimitScope;
  identifier: string;
  now?: number;
}): Promise<RateLimitResult> {
  const now = params.now ?? nowTimestamp();
  const config = LIMIT_CONFIG[params.scope];
  const normalizedIdentifier = normalizeIdentifier(params.identifier);
  const key = `${CachePrefix.RATE_LIMIT}web:${params.scope}:${normalizedIdentifier}`;
  const ttlSeconds = Math.max(1, Math.ceil(config.windowMs / 1000));
  const cache = getCache();

  try {
    const count = await cache.increment(key, ttlSeconds);
    if (count <= 0) {
      return checkMemoryRateLimit(key, config, now);
    }

    const resetAt = now + config.windowMs;
    return {
      allowed: count <= config.limit,
      remaining: Math.max(0, config.limit - count),
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil(config.windowMs / 1000)),
    };
  } catch (error) {
    logger.warn(
      {
        err: error,
        scope: params.scope,
        identifier: normalizedIdentifier,
      },
      "Rate limit redis check failed; using memory fallback"
    );
    return checkMemoryRateLimit(key, config, now);
  }
}

export async function checkCompositeRateLimits(
  checks: Array<{ scope: BookingRateLimitScope; identifier: string }>
): Promise<RateLimitResult> {
  let mostRestrictive: RateLimitResult = {
    allowed: true,
    remaining: Number.MAX_SAFE_INTEGER,
    resetAt: nowTimestamp(),
    retryAfterSeconds: 1,
  };

  for (const check of checks) {
    const result = await checkBookingRateLimit(check);
    if (!result.allowed) {
      return result;
    }

    if (result.remaining < mostRestrictive.remaining) {
      mostRestrictive = result;
    }
  }

  return mostRestrictive;
}

export function getRequestIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp;

  return "unknown";
}

export function buildCustomerRateLimitIdentifier(referenceNumber: string, email: string): string {
  return `${referenceNumber.trim().toUpperCase()}::${email.trim().toLowerCase()}`;
}
