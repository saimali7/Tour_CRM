import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure, adminProcedure } from "../trpc";
import { db, eq, and } from "@tour/database";
import { organizationMembers, users } from "@tour/database/schema";
import type { OrganizationRole } from "@tour/database";
import { inngest } from "@/inngest/client";

const roleSchema = z.enum(["owner", "admin", "manager", "support", "guide"]);

export const teamRouter = createRouter({
  /**
   * Get all team members for the current organization
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, ctx.orgContext.organizationId),
      with: {
        user: true,
      },
      orderBy: (members, { asc }) => [asc(members.createdAt)],
    });

    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      status: member.status,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: {
        id: member.user.id,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        avatarUrl: member.user.avatarUrl,
      },
    }));
  }),

  /**
   * Get a single team member by ID
   */
  getById: protectedProcedure
    .input(z.object({ memberId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.id, input.memberId),
          eq(organizationMembers.organizationId, ctx.orgContext.organizationId)
        ),
        with: {
          user: true,
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      return member;
    }),

  /**
   * Invite a new team member by email
   * Creates user if they don't exist, or adds existing user to org
   */
  invite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: roleSchema.default("support"),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      let user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      // If user doesn't exist, create a placeholder (will be updated on Clerk sync)
      if (!user) {
        const [newUser] = await db
          .insert(users)
          .values({
            clerkId: `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
          })
          .returning();
        user = newUser;
      }

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      // Check if user is already a member of this org
      const existingMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, ctx.orgContext.organizationId),
          eq(organizationMembers.userId, user.id)
        ),
      });

      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this organization",
        });
      }

      // Prevent inviting as owner (only one owner allowed)
      if (input.role === "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot invite as owner. Transfer ownership instead.",
        });
      }

      // Create membership
      const [membership] = await db
        .insert(organizationMembers)
        .values({
          organizationId: ctx.orgContext.organizationId,
          userId: user.id,
          role: input.role as OrganizationRole,
          status: "invited",
        })
        .returning();

      if (!membership) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create membership",
        });
      }

      // Send invite email via Inngest
      const inviterName = ctx.orgContext.user.firstName
        ? `${ctx.orgContext.user.firstName} ${ctx.orgContext.user.lastName || ""}`.trim()
        : ctx.orgContext.user.email;

      try {
        await inngest.send({
          name: "team/member-invited",
          data: {
            organizationId: ctx.orgContext.organizationId,
            membershipId: membership.id,
            inviteeEmail: input.email,
            inviteeName: input.firstName
              ? `${input.firstName} ${input.lastName || ""}`.trim()
              : undefined,
            inviterName,
            role: input.role,
          },
        });
      } catch (error) {
        // Log but don't fail the invite - membership was created
        console.error("Failed to send invite email event:", error);
      }

      return {
        membership,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }),

  /**
   * Update a team member's role
   */
  updateRole: adminProcedure
    .input(
      z.object({
        memberId: z.string(),
        role: roleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the member
      const member = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.id, input.memberId),
          eq(organizationMembers.organizationId, ctx.orgContext.organizationId)
        ),
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // Prevent changing owner's role (use transfer ownership instead)
      if (member.role === "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change owner's role. Transfer ownership instead.",
        });
      }

      // Prevent promoting to owner
      if (input.role === "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot promote to owner. Use transfer ownership instead.",
        });
      }

      // Prevent changing own role
      if (member.userId === ctx.orgContext.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }

      const [updated] = await db
        .update(organizationMembers)
        .set({
          role: input.role as OrganizationRole,
          updatedAt: new Date(),
        })
        .where(eq(organizationMembers.id, input.memberId))
        .returning();

      return updated;
    }),

  /**
   * Remove a team member from the organization
   */
  remove: adminProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the member
      const member = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.id, input.memberId),
          eq(organizationMembers.organizationId, ctx.orgContext.organizationId)
        ),
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // Prevent removing owner
      if (member.role === "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the owner. Transfer ownership first.",
        });
      }

      // Prevent removing yourself
      if (member.userId === ctx.orgContext.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove yourself from the organization",
        });
      }

      await db
        .delete(organizationMembers)
        .where(eq(organizationMembers.id, input.memberId));

      return { success: true };
    }),

  /**
   * Update member status (activate, suspend, etc.)
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        memberId: z.string(),
        status: z.enum(["active", "invited", "suspended"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the member
      const member = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.id, input.memberId),
          eq(organizationMembers.organizationId, ctx.orgContext.organizationId)
        ),
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // Prevent suspending owner
      if (member.role === "owner" && input.status === "suspended") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot suspend the owner",
        });
      }

      // Prevent suspending yourself
      if (member.userId === ctx.orgContext.user.id && input.status === "suspended") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot suspend yourself",
        });
      }

      const [updated] = await db
        .update(organizationMembers)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(organizationMembers.id, input.memberId))
        .returning();

      return updated;
    }),

  /**
   * Get team statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, ctx.orgContext.organizationId),
    });

    return {
      total: members.length,
      active: members.filter((m) => m.status === "active").length,
      invited: members.filter((m) => m.status === "invited").length,
      suspended: members.filter((m) => m.status === "suspended").length,
      byRole: {
        owner: members.filter((m) => m.role === "owner").length,
        admin: members.filter((m) => m.role === "admin").length,
        manager: members.filter((m) => m.role === "manager").length,
        support: members.filter((m) => m.role === "support").length,
        guide: members.filter((m) => m.role === "guide").length,
      },
    };
  }),
});
