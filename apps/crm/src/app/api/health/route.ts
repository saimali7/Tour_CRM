import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db, sql } from "@tour/database";
import { env } from "@tour/config";
import {
  checkCacheHealth,
  isCacheConfigured,
  checkStorageHealth,
  isStorageConfigured,
} from "@tour/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "unconfigured";
  message?: string;
  latency?: number;
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
  services: ServiceHealth[];
}

// Track server start time for uptime
const SERVER_START = Date.now();

async function checkDatabase(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      name: "database",
      status: "healthy",
      latency: Date.now() - startTime,
    };
  } catch (error) {
    // Capture database connection failures in Sentry - this is critical
    Sentry.captureException(error, {
      tags: {
        service: "health-check",
        operation: "database-check",
        severity: "critical",
      },
      level: "error",
    });

    return {
      name: "database",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Connection failed",
      latency: Date.now() - startTime,
    };
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  if (!isCacheConfigured()) {
    return {
      name: "redis",
      status: "unconfigured",
      message: "REDIS_URL not set",
    };
  }

  const result = await checkCacheHealth();
  return {
    name: "redis",
    status: result.healthy ? "healthy" : "unhealthy",
    message: result.message,
    latency: result.latency,
  };
}

async function checkStorage(): Promise<ServiceHealth> {
  if (!isStorageConfigured()) {
    return {
      name: "storage",
      status: "unconfigured",
      message: "S3 storage not configured",
    };
  }

  const result = await checkStorageHealth();
  return {
    name: "storage",
    status: result.healthy ? "healthy" : "degraded",
    message: result.message,
    latency: result.latency,
  };
}

function checkClerk(): ServiceHealth {
  if (!env.isClerkEnabled()) {
    return {
      name: "clerk",
      status: "unconfigured",
      message: "Clerk disabled (ENABLE_CLERK=false)",
    };
  }

  if (!process.env.CLERK_SECRET_KEY) {
    return {
      name: "clerk",
      status: "unhealthy",
      message: "CLERK_SECRET_KEY not configured",
    };
  }

  const isValidKey =
    process.env.CLERK_SECRET_KEY.startsWith("sk_test_") ||
    process.env.CLERK_SECRET_KEY.startsWith("sk_live_");

  return {
    name: "clerk",
    status: isValidKey ? "healthy" : "degraded",
    message: isValidKey ? undefined : "Invalid key format",
  };
}

function checkStripe(): ServiceHealth {
  if (!env.isStripeConfigured()) {
    return {
      name: "stripe",
      status: "unconfigured",
      message: "Stripe not configured",
    };
  }

  const key = process.env.STRIPE_SECRET_KEY!;
  const isValidKey = key.startsWith("sk_test_") || key.startsWith("sk_live_");
  const isLive = key.startsWith("sk_live_");

  return {
    name: "stripe",
    status: isValidKey ? "healthy" : "degraded",
    message: isValidKey ? (isLive ? "Live mode" : "Test mode") : "Invalid key format",
  };
}

function checkResend(): ServiceHealth {
  if (!env.isEmailConfigured()) {
    return {
      name: "resend",
      status: "unconfigured",
      message: "Email not configured",
    };
  }

  const key = process.env.RESEND_API_KEY!;
  const isValidKey = key.startsWith("re_");

  return {
    name: "resend",
    status: isValidKey ? "healthy" : "degraded",
    message: isValidKey ? undefined : "Invalid key format",
  };
}

function checkInngest(): ServiceHealth {
  if (!env.isInngestConfigured()) {
    return {
      name: "inngest",
      status: "unconfigured",
      message: "Inngest not configured",
    };
  }

  // Check if keys are present
  const hasEventKey = !!process.env.INNGEST_EVENT_KEY;
  const hasSigningKey = !!process.env.INNGEST_SIGNING_KEY;

  if (!hasEventKey || !hasSigningKey) {
    return {
      name: "inngest",
      status: "degraded",
      message: !hasEventKey ? "Missing EVENT_KEY" : "Missing SIGNING_KEY",
    };
  }

  return {
    name: "inngest",
    status: "healthy",
  };
}

function checkSentry(): ServiceHealth {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    return {
      name: "sentry",
      status: "unconfigured",
      message: "Sentry DSN not configured",
    };
  }

  // Validate DSN format
  const isValidDsn = dsn.startsWith("https://") && dsn.includes("@") && dsn.includes("sentry");

  return {
    name: "sentry",
    status: isValidDsn ? "healthy" : "degraded",
    message: isValidDsn ? undefined : "Invalid DSN format",
  };
}

function checkTwilio(): ServiceHealth {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return {
      name: "twilio",
      status: "unconfigured",
      message: "Twilio not configured",
    };
  }

  const isValidSid = accountSid.startsWith("AC");

  return {
    name: "twilio",
    status: isValidSid ? "healthy" : "degraded",
    message: isValidSid ? undefined : "Invalid Account SID format",
  };
}

export async function GET() {
  // Run all health checks in parallel
  const [database, redis, storage] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStorage(),
  ]);

  // Synchronous checks
  const services: ServiceHealth[] = [
    database,
    redis,
    storage,
    checkClerk(),
    checkStripe(),
    checkResend(),
    checkInngest(),
    checkSentry(),
    checkTwilio(),
  ];

  // Determine overall status
  const hasUnhealthy = services.some((s) => s.status === "unhealthy");
  const hasDegraded = services.some((s) => s.status === "degraded");

  let status: HealthStatus["status"] = "healthy";
  if (hasUnhealthy) {
    status = "unhealthy";
  } else if (hasDegraded) {
    status = "degraded";
  }

  const health: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor((Date.now() - SERVER_START) / 1000),
    services,
  };

  const statusCode = status === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
