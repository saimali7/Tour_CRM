import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { getOrgContext, getCurrentUser, type OrgContext } from "../lib/auth";
import type { User } from "@tour/database";
import {
  checkRateLimit,
  createRateLimitKey,
  RATE_LIMITS,
} from "../lib/rate-limit";
import { logger, runWithCorrelation, getCorrelationId } from "@tour/services";

/**
 * tRPC context type
 */
export interface Context {
  orgSlug: string | null;
  orgContext: OrgContext | null;
  user: User | null;
  /** Correlation ID for request tracing */
  correlationId: string;
}

/**
 * Generate a correlation ID for request tracing
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `trpc_${timestamp}_${random}`;
}

/**
 * Create context for each request
 */
export const createContext = async (opts: {
  headers: Headers;
}): Promise<Context> => {
  // Generate or extract correlation ID
  // Check for existing correlation ID from upstream (e.g., API gateway)
  const correlationId =
    opts.headers.get("x-correlation-id") ?? generateCorrelationId();

  // Extract org slug from headers (set by middleware)
  const orgSlug = opts.headers.get("x-org-slug");

  // Get the current user
  const user = await getCurrentUser();

  let orgContext: OrgContext | null = null;

  if (orgSlug) {
    try {
      orgContext = await getOrgContext(orgSlug);
    } catch (error) {
      logger.debug({ err: error, orgSlug, correlationId }, "User may not have access to this org");
    }
  }

  return {
    orgSlug,
    orgContext,
    user: user ?? null,
    correlationId,
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
 * Base middleware that wraps all procedure calls with correlation context.
 * This ensures the correlation ID is propagated to all service methods
 * via AsyncLocalStorage, enabling distributed tracing across the request lifecycle.
 */
const correlationMiddleware = t.middleware(async ({ ctx, next }) => {
  // Run the next handler within the correlation context
  // This makes the correlation ID available to all downstream service calls
  return runWithCorrelation(
    {
      correlationId: ctx.correlationId,
      organizationId: ctx.orgContext?.organizationId,
      userId: ctx.user?.id,
    },
    () => next({ ctx })
  );
});

/**
 * Base procedure with correlation context
 * All other procedures should build on this
 */
const baseProcedure = t.procedure.use(correlationMiddleware);

/**
 * Public procedure - no auth required
 */
export const publicProcedure = baseProcedure;

/**
 * Protected procedure - requires auth and org context
 */
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
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
export const authenticatedProcedure = baseProcedure.use(async ({ ctx, next }) => {
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

/**
 * Rate-limited procedures for different operation types
 * Use these for sensitive operations that need throttling
 */

// For bulk operations (5 req/min) - extends adminProcedure
export const bulkProcedure = adminProcedure.use(async ({ ctx, next }) => {
  const key = createRateLimitKey(
    ctx.user?.id,
    ctx.orgContext.organizationId,
    "bulk"
  );

  const result = await checkRateLimit(key, RATE_LIMITS.bulk);

  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${Math.ceil(result.resetIn / 1000)} seconds.`,
    });
  }

  return next({ ctx });
});

// For sensitive operations like payment processing (10 req/min) - extends adminProcedure
export const sensitiveProcedure = adminProcedure.use(async ({ ctx, next }) => {
  const key = createRateLimitKey(
    ctx.user?.id,
    ctx.orgContext.organizationId,
    "sensitive"
  );

  const result = await checkRateLimit(key, RATE_LIMITS.sensitive);

  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${Math.ceil(result.resetIn / 1000)} seconds.`,
    });
  }

  return next({ ctx });
});
