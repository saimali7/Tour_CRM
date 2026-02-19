import type { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
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

export function checkBookingRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
  if (rateLimitStore.size > 1000) {
    for (const [storedIp, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(storedIp);
      }
    }
  }

  const existing = rateLimitStore.get(ip);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(ip, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetAt,
    };
  }

  const nextCount = existing.count + 1;
  const allowed = nextCount <= MAX_REQUESTS_PER_WINDOW;

  rateLimitStore.set(ip, {
    count: nextCount,
    resetAt: existing.resetAt,
  });

  return {
    allowed,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - nextCount),
    resetAt: existing.resetAt,
  };
}
