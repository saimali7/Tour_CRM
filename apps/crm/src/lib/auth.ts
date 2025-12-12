import { auth, currentUser } from "@clerk/nextjs/server";
import { db, eq, and } from "@tour/database";
import { users, organizationMembers, organizations } from "@tour/database/schema";

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
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Try to find existing user
  let user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  // If user doesn't exist, sync from Clerk
  if (!user) {
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
      .returning();

    user = newUser;
  }

  return user;
}

/**
 * Get organization context for a given org slug
 * Validates that the current user has access to this organization
 */
export async function getOrgContext(orgSlug: string): Promise<OrgContext> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized: No user found");
  }

  // Get organization by slug
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  // Verify user has access to this organization
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, org.id),
      eq(organizationMembers.userId, user.id),
      eq(organizationMembers.status, "active")
    ),
  });

  if (!membership) {
    // Check if user is super admin
    if (!user.isSuperAdmin) {
      throw new Error("Access denied: Not a member of this organization");
    }
  }

  return {
    organizationId: org.id,
    organization: org,
    membership: membership!,
    user,
    role: membership?.role ?? (user.isSuperAdmin ? "admin" : "support"),
  };
}

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
  const [resource, action] = permission.split(":");
  if (permissions.includes(`${resource}:*`)) return true;

  return false;
}
