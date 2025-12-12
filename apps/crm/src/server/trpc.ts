import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { getOrgContext, getCurrentUser, type OrgContext } from "../lib/auth";
import type { User } from "@tour/database";

/**
 * tRPC context type
 */
export interface Context {
  orgSlug: string | null;
  orgContext: OrgContext | null;
  user: User | null;
}

/**
 * Create context for each request
 */
export const createContext = async (opts: {
  headers: Headers;
}): Promise<Context> => {
  // Extract org slug from headers (set by middleware)
  const orgSlug = opts.headers.get("x-org-slug");

  // Get the current user
  const user = await getCurrentUser();

  let orgContext: OrgContext | null = null;

  if (orgSlug) {
    try {
      orgContext = await getOrgContext(orgSlug);
    } catch {
      // User might not have access to this org
    }
  }

  return {
    orgSlug,
    orgContext,
    user: user ?? null,
  };
};

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create router and procedure helpers
 */
export const createRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public procedure - no auth required
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires auth and org context
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.orgContext) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in and have access to an organization",
    });
  }

  return next({
    ctx: {
      ...ctx,
      orgContext: ctx.orgContext,
    },
  });
});

/**
 * Admin procedure - requires admin or owner role
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const role = ctx.orgContext.role;
  if (role !== "owner" && role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({ ctx });
});

/**
 * Authenticated procedure - requires logged in user but not org context
 * Used for user-level operations like onboarding
 */
export const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
