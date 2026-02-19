import { NextResponse, type NextRequest } from "next/server";

/**
 * Subdomain routing proxy for the public booking website.
 *
 * Domain patterns:
 * - Production: {slug}.book.platform.com
 * - Development: {slug}.localhost:3001
 *
 * The proxy extracts the organization slug from the subdomain and
 * rewrites the URL to include the slug as a path parameter.
 */

// Subdomains that should NOT be treated as organization slugs
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "book", // The base booking domain itself
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
]);

/**
 * Extract organization slug from the hostname.
 *
 * Examples:
 * - "acme.book.tourplatform.com" -> "acme"
 * - "acme.localhost" -> "acme"
 * - "book.tourplatform.com" -> null
 * - "localhost" -> null
 */
function extractOrgSlug(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(":")[0] || "";

  // Handle localhost development
  // Pattern: {slug}.localhost
  if (host.endsWith(".localhost")) {
    const slug = host.replace(".localhost", "");
    if (slug && !RESERVED_SUBDOMAINS.has(slug)) {
      return slug;
    }
    return null;
  }

  // Handle production domains
  // Pattern: {slug}.book.{domain} or {slug}.{domain}
  const parts = host.split(".");

  // Need at least 3 parts for subdomain: slug.book.domain.com or slug.domain.com
  if (parts.length >= 3) {
    const slug = parts[0];
    // If slug is "book" or reserved, there's no org subdomain
    if (slug && !RESERVED_SUBDOMAINS.has(slug)) {
      return slug;
    }
  }

  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Skip proxy for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // Files with extensions (images, favicon, etc.)
  ) {
    return NextResponse.next();
  }

  // Extract organization slug from subdomain
  const orgSlug = extractOrgSlug(hostname);

  // If no org slug found, show a landing page or error
  if (!orgSlug) {
    // For the base domain, show a generic page or redirect to main site
    if (pathname === "/") {
      // Rewrite to a "no-org" page that explains the user needs to visit a specific booking site
      return NextResponse.rewrite(new URL("/no-org", request.url));
    }
    return NextResponse.next();
  }

  // Check for reserved/invalid slugs
  if (RESERVED_SUBDOMAINS.has(orgSlug)) {
    return NextResponse.rewrite(new URL("/no-org", request.url));
  }

  // Store org slug in request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-org-slug", orgSlug);

  // Keep API routes at /api/* while still injecting organization context header.
  if (pathname.startsWith("/api")) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // If already on an org-scoped route, just add the header
  if (pathname.startsWith(`/org/${orgSlug}`)) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Rewrite the path to include organization context
  // e.g., /tours -> /org/acme/tours
  const url = request.nextUrl.clone();
  url.pathname = `/org/${orgSlug}${pathname}`;

  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next|static|.*\\..*).*)",
  ],
};
