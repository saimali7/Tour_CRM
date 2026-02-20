import { z } from "zod";

// =============================================================================
// Server-side Environment Schema
// =============================================================================

export const serverEnvSchema = z.object({
  // Database (required)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(), // Direct connection for migrations (bypasses PgBouncer)

  // Auth (optional in dev - can run without Clerk)
  ENABLE_CLERK: z.enum(["true", "false"]).default("false"),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // Payments (optional - Stripe Connect per tenant)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Email (optional - degrades gracefully)
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Background Jobs (optional)
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Cache (optional - Redis)
  REDIS_URL: z.string().optional(),

  // Storage (optional - S3/MinIO)
  S3_ENDPOINT: z.string().optional(), // e.g., http://minio:9000 or https://s3.amazonaws.com
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(), // Default bucket name
  S3_REGION: z.string().optional().default("us-east-1"), // Required by SDK, MinIO ignores
  S3_PUBLIC_URL: z.string().optional(), // Public URL for serving files (via CDN)

  // Security
  JWT_SECRET: z.string().min(32).optional(),

  // Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// =============================================================================
// Client-side Environment Schema
// =============================================================================

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().min(1, "NEXT_PUBLIC_APP_URL is required"),
  NEXT_PUBLIC_WEB_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

// =============================================================================
// Environment Helper Functions
// =============================================================================

export const env = {
  /** Check if running in production */
  isProduction: () => process.env.NODE_ENV === "production",

  /** Check if running in development */
  isDevelopment: () => process.env.NODE_ENV === "development",

  /** Check if running in test environment */
  isTest: () => process.env.NODE_ENV === "test",

  /** Check if Clerk authentication is enabled */
  isClerkEnabled: () => process.env.ENABLE_CLERK === "true",

  /** Check if Stripe is configured */
  isStripeConfigured: () => !!process.env.STRIPE_SECRET_KEY,

  /** Check if email service (Resend) is configured */
  isEmailConfigured: () => !!process.env.RESEND_API_KEY,

  /** Check if background jobs (Inngest) are configured */
  isInngestConfigured: () => !!process.env.INNGEST_EVENT_KEY && !!process.env.INNGEST_SIGNING_KEY,

  /** Check if Redis cache is configured */
  isRedisConfigured: () => !!process.env.REDIS_URL,

  /** Check if S3/MinIO storage is configured */
  isS3Configured: () => !!process.env.S3_ENDPOINT && !!process.env.S3_ACCESS_KEY && !!process.env.S3_SECRET_KEY,

  /** Get the app URL */
  getAppUrl: () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  /** Get the web/booking URL */
  getWebUrl: () => process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001",

  /** Get S3/MinIO configuration */
  getS3Config: () => ({
    endpoint: process.env.S3_ENDPOINT,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET || "tour-images",
    region: process.env.S3_REGION || "us-east-1",
    publicUrl: process.env.S3_PUBLIC_URL,
  }),
};

// =============================================================================
// Validation Functions
// =============================================================================

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate server environment variables
 * Returns validation result with errors and warnings
 */
export function validateServerEnv(): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
  };

  // Parse and validate
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    result.success = false;
    result.errors = parsed.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    return result;
  }

  const env = parsed.data;

  // Check for production requirements
  if (env.NODE_ENV === "production") {
    if (env.ENABLE_CLERK !== "true") {
      result.warnings.push("ENABLE_CLERK should be 'true' in production");
    }
    if (!env.CLERK_SECRET_KEY) {
      result.errors.push("CLERK_SECRET_KEY is required in production");
      result.success = false;
    }
    if (!env.JWT_SECRET) {
      result.errors.push("JWT_SECRET is required in production");
      result.success = false;
    }
    if (!env.STRIPE_SECRET_KEY) {
      result.warnings.push("STRIPE_SECRET_KEY not set - payments will not work");
    }
    if (!env.RESEND_API_KEY) {
      result.warnings.push("RESEND_API_KEY not set - emails will not be sent");
    }
  }

  // Development warnings
  if (env.NODE_ENV === "development") {
    if (!env.STRIPE_SECRET_KEY) {
      result.warnings.push("STRIPE_SECRET_KEY not set - payment features disabled");
    }
    if (!env.RESEND_API_KEY) {
      result.warnings.push("RESEND_API_KEY not set - emails will be logged only");
    }
  }

  return result;
}

/**
 * Validate client environment variables
 */
export function validateClientEnv(): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
  };

  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    result.success = false;
    result.errors = parsed.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
  }

  return result;
}

/**
 * Log environment validation results
 */
export function logEnvValidation(result: ValidationResult, prefix = ""): void {
  if (result.errors.length > 0) {
    console.error(`${prefix}❌ Environment validation errors:`);
    result.errors.forEach((e) => console.error(`   - ${e}`));
  }

  if (result.warnings.length > 0) {
    console.warn(`${prefix}⚠️  Environment warnings:`);
    result.warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  if (result.success && result.warnings.length === 0) {
    console.log(`${prefix}✓ Environment validated successfully`);
  }
}
