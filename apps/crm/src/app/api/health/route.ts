import { NextResponse } from "next/server";
import { db } from "@tour/database";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: { status: "up" | "down"; latency?: number; error?: string };
  };
}

export async function GET() {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks: {
      database: { status: "down" },
    },
  };

  // Check database connection
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    health.checks.database = {
      status: "up",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    health.checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    health.status = "unhealthy";
  }

  // Determine overall status
  const allUp = Object.values(health.checks).every((c) => c.status === "up");
  if (!allUp) {
    health.status = "degraded";
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
