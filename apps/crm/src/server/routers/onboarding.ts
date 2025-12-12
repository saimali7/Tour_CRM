import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authenticatedProcedure } from "../trpc";
import { db, eq, and } from "@tour/database";
import { organizations, organizationMembers } from "@tour/database/schema";
import { slugSchema } from "@tour/validators";

const createOrganizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: slugSchema,
  email: z.string().email(),
  timezone: z.string().default("UTC"),
  settings: z
    .object({
      defaultCurrency: z.string().default("USD"),
      defaultLanguage: z.string().default("en"),
    })
    .optional(),
});

export const onboardingRouter = createRouter({
  /**
   * Check if a slug is available
   */
  checkSlugAvailability: authenticatedProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ input }) => {
      const existing = await db.query.organizations.findFirst({
        where: eq(organizations.slug, input.slug),
      });

      return {
        available: !existing,
        slug: input.slug,
      };
    }),

  /**
   * Create a new organization and make the current user the owner
   */
  createOrganization: authenticatedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if slug is already taken
      const existingOrg = await db.query.organizations.findFirst({
        where: eq(organizations.slug, input.slug),
      });

      if (existingOrg) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An organization with this slug already exists",
        });
      }

      // Create the organization
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: input.name,
          slug: input.slug,
          email: input.email,
          timezone: input.timezone,
          settings: {
            defaultCurrency: input.settings?.defaultCurrency || "USD",
            defaultLanguage: input.settings?.defaultLanguage || "en",
          },
          plan: "free",
          status: "active",
        })
        .returning();

      if (!newOrg) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create organization",
        });
      }

      // Add the current user as owner
      const [membership] = await db
        .insert(organizationMembers)
        .values({
          organizationId: newOrg.id,
          userId: ctx.user.id,
          role: "owner",
          status: "active",
        })
        .returning();

      if (!membership) {
        // Rollback organization creation if membership fails
        await db.delete(organizations).where(eq(organizations.id, newOrg.id));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add you as owner",
        });
      }

      return {
        organization: newOrg,
        membership,
      };
    }),

  /**
   * Get all organizations for the current user
   */
  getMyOrganizations: authenticatedProcedure.query(async ({ ctx }) => {
    // If super admin, return all organizations
    if (ctx.user.isSuperAdmin) {
      return db.query.organizations.findMany({
        where: eq(organizations.status, "active"),
      });
    }

    // Otherwise, return organizations where user is a member
    const memberships = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.userId, ctx.user.id),
        eq(organizationMembers.status, "active")
      ),
      with: {
        organization: true,
      },
    });

    return memberships
      .map((m) => m.organization)
      .filter((org) => org.status === "active");
  }),

  /**
   * Check if current user needs onboarding (has no organizations)
   */
  needsOnboarding: authenticatedProcedure.query(async ({ ctx }) => {
    // Super admins don't need onboarding
    if (ctx.user.isSuperAdmin) {
      return { needsOnboarding: false, organizationCount: 0 };
    }

    // Check if user has any active memberships
    const memberships = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.userId, ctx.user.id),
        eq(organizationMembers.status, "active")
      ),
    });

    return {
      needsOnboarding: memberships.length === 0,
      organizationCount: memberships.length,
    };
  }),
});
