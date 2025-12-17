import { NextResponse } from "next/server";
import { db, sql } from "@tour/database";
import { env } from "@tour/config";

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
  services: ServiceHealth[];
}

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
    return {
      name: "database",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Connection failed",
      latency: Date.now() - startTime,
    };
  }
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

export async function GET() {
  const services: ServiceHealth[] = [
    await checkDatabase(),
    checkClerk(),
    checkStripe(),
    checkResend(),
  ];

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
    services,
  };

  const statusCode = status === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, { status: statusCode });
}
