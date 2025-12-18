import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

/**
 * Authentication Middleware
 *
 * SECURITY: Dev auth bypass is ONLY enabled when:
 * 1. NODE_ENV is explicitly "development"
 * 2. DEV_AUTH_BYPASS is explicitly set to "true"
 *
 * In production, Clerk is always required regardless of env vars.
 */
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEV_AUTH_BYPASS_ENABLED =
  !IS_PRODUCTION &&
  process.env.NODE_ENV === "development" &&
  process.env.DEV_AUTH_BYPASS === "true";

// Clerk middleware - used in production and when dev bypass is disabled
async function clerkAuth(req: NextRequest, event: NextFetchEvent) {
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");

  const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks(.*)",
    "/api/trpc(.*)",
    "/api/health(.*)",
    "/api/inngest(.*)",
  ]);

  return clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  })(req, event);
}

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  // Dev auth bypass - ONLY in development with explicit flag
  // NEVER bypasses in production, regardless of env vars
  if (DEV_AUTH_BYPASS_ENABLED) {
    return NextResponse.next();
  }

  // Production path - always use Clerk
  return clerkAuth(req, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
