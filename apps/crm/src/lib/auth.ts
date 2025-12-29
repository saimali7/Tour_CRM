import { db, eq, and } from "@tour/database";
import { users, organizationMembers, organizations } from "@tour/database/schema";
import { cache } from "react";
import { unstable_cache } from "next/cache";

/**
 * Authentication configuration
 *
 * SECURITY: Dev mode bypass is ONLY enabled when:
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

// Log warning if dev auth bypass is enabled
if (DEV_AUTH_BYPASS_ENABLED) {
  console.warn(
    "\n⚠️  WARNING: Dev auth bypass is enabled. All authentication is being bypassed.\n" +
    "   This should NEVER be used in production.\n" +
    "   Set DEV_AUTH_BYPASS=false or remove it to enable proper authentication.\n"
  );
}

export interface OrgContext {
  organizationId: string;
  organization: typeof organizations.$inferSelect;
  membership: typeof organizationMembers.$inferSelect;
  user: typeof users.$inferSelect;
  role: string;
}

/**
 * Get the current authenticated user from the database
 * Creates the user if they don't exist (syncs from Clerk)
 *
 * Wrapped with React cache() for request-level deduplication
 */
export const getCurrentUser = cache(async () => {
  // Dev mode bypass - ONLY in development with explicit flag
  if (DEV_AUTH_BYPASS_ENABLED) {
    const devUser = await db.query.users.findFirst();
    if (!devUser) {
      console.warn("DEV AUTH BYPASS: No users found in database. Please seed the database.");
    }
    return devUser || null;
  }

  // Production path - always use Clerk
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Try to find existing user - cached across requests
  const user = await getCachedUser(userId);

  if (user) {
    return user;
  }

  // If user doesn't exist, sync from Clerk (rare path)
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      avatarUrl: clerkUser.imageUrl,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        avatarUrl: clerkUser.imageUrl,
        updatedAt: new Date(),
      },
    })
    .returning();

  return newUser;
});

/**
 * Cached user lookup - revalidates every 5 minutes or on-demand
 */
const getCachedUser = unstable_cache(
  async (clerkId: string) => {
    return db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
  },
  ["user-by-clerk-id"],
  { revalidate: 300, tags: ["user"] }
);

/**
 * Cached organization lookup - revalidates every 5 minutes
 */
const getCachedOrganization = unstable_cache(
  async (orgSlug: string) => {
    return db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });
  },
  ["org-by-slug"],
  { revalidate: 300, tags: ["organization"] }
);

/**
 * Cached membership lookup - revalidates every 5 minutes
 */
const getCachedMembership = unstable_cache(
  async (orgId: string, userId: string) => {
    return db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.status, "active")
      ),
    });
  },
  ["membership"],
  { revalidate: 300, tags: ["membership"] }
);

/**
 * Get organization context for a given org slug
 * Validates that the current user has access to this organization
 *
 * Wrapped with React cache() for request-level deduplication
 * Uses unstable_cache for cross-request caching of DB queries
 */
export const getOrgContext = cache(async (orgSlug: string): Promise<OrgContext> => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized: No user found");
  }

  // Get organization by slug - cached
  const org = await getCachedOrganization(orgSlug);

  if (!org) {
    throw new Error("Organization not found");
  }

  // Dev mode bypass - skip membership check ONLY in development with explicit flag
  if (DEV_AUTH_BYPASS_ENABLED) {
    // Create a mock membership for dev mode
    const mockMembership = {
      id: "dev-membership",
      organizationId: org.id,
      userId: user.id,
      role: "admin" as const,
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      organizationId: org.id,
      organization: org,
      membership: mockMembership as typeof organizationMembers.$inferSelect,
      user,
      role: "admin",
    };
  }

  // Verify user has access to this organization - cached
  const membership = await getCachedMembership(org.id, user.id);

  if (!membership) {
    // Check if user is super admin
    if (!user.isSuperAdmin) {
      throw new Error("Access denied: Not a member of this organization");
    }
  }

  // For super admins without membership, create a synthetic membership
  const effectiveMembership = membership ?? {
    id: `superadmin-${user.id}-${org.id}`,
    organizationId: org.id,
    userId: user.id,
    role: "admin" as const,
    status: "active" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    organizationId: org.id,
    organization: org,
    membership: effectiveMembership as typeof organizationMembers.$inferSelect,
    user,
    role: membership?.role ?? (user.isSuperAdmin ? "admin" : "support"),
  };
});

/**
 * Get all organizations the current user has access to
 */
export async function getUserOrganizations() {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  // If super admin, return all organizations
  if (user.isSuperAdmin) {
    return db.query.organizations.findMany({
      where: eq(organizations.status, "active"),
    });
  }

  // Otherwise, return organizations where user is a member
  const memberships = await db.query.organizationMembers.findMany({
    where: and(
      eq(organizationMembers.userId, user.id),
      eq(organizationMembers.status, "active")
    ),
    with: {
      organization: true,
    },
  });

  return memberships
    .map((m) => m.organization)
    .filter((org) => org.status === "active");
}

/**
 * Check if user has a specific permission in the organization
 */
export function hasPermission(role: string, permission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    owner: ["*"],
    admin: [
      "bookings:*",
      "customers:*",
      "tours:*",
      "schedules:*",
      "guides:*",
      "reports:*",
      "settings:read",
      "settings:booking",
      "settings:communications",
      "team:read",
      "team:invite",
    ],
    manager: [
      "bookings:*",
      "customers:read",
      "customers:update",
      "tours:read",
      "schedules:*",
      "guides:read",
      "guides:assign",
      "reports:read",
    ],
    support: [
      "bookings:read",
      "bookings:update",
      "customers:read",
      "customers:update",
      "schedules:read",
    ],
    guide: ["schedules:read:assigned", "bookings:read:assigned"],
  };

  const permissions = rolePermissions[role] || [];

  if (permissions.includes("*")) return true;
  if (permissions.includes(permission)) return true;

  // Check wildcard patterns
  const [resource, _action] = permission.split(":");
  if (permissions.includes(`${resource}:*`)) return true;

  return false;
}
