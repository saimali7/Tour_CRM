import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

// =============================================================================
// AUTH DISABLED FOR TESTING
// =============================================================================
// Set ENABLE_CLERK=true in environment to re-enable Clerk authentication
// =============================================================================

const ENABLE_CLERK = process.env.ENABLE_CLERK === "true";

// Clerk middleware (only used when ENABLE_CLERK=true)
async function clerkAuth(req: NextRequest, event: NextFetchEvent) {
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");

  const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks(.*)",
    "/api/trpc(.*)",
    "/api/health(.*)",
  ]);

  return clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  })(req, event);
}

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  // If Clerk is disabled, allow all requests
  if (!ENABLE_CLERK) {
    return NextResponse.next();
  }

  // Otherwise use Clerk authentication
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
