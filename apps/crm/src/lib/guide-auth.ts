import { db, eq, and, gt, lt } from "@tour/database";
import { guideTokens, guides, organizations } from "@tour/database/schema";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";

const COOKIE_NAME = "guide-portal-token";

/**
 * Get the JWT secret - lazy initialization to avoid build-time errors
 * Throws at runtime if GUIDE_JWT_SECRET is not set
 */
function getJwtSecret(): Uint8Array {
  const jwtSecret = process.env.GUIDE_JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("GUIDE_JWT_SECRET environment variable must be set");
  }
  return new TextEncoder().encode(jwtSecret);
}
const TOKEN_EXPIRY_DAYS = 7;

export interface GuideContext {
  guideId: string;
  organizationId: string;
  guide: typeof guides.$inferSelect;
  organization: typeof organizations.$inferSelect;
}

/**
 * Generate a magic link token for a guide
 */
export async function generateGuideMagicLink(
  guideId: string,
  organizationId: string,
  baseUrl: string
): Promise<string> {
  // Generate a random token
  const rawToken = randomBytes(32).toString("hex");

  // Hash the token for storage (security best practice)
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");

  // Calculate expiration (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

  // Store the hashed token in the database
  await db.insert(guideTokens).values({
    organizationId,
    guideId,
    token: hashedToken,
    expiresAt,
  });

  // Return the magic link with the raw token
  return `${baseUrl}/guide/auth?token=${rawToken}`;
}

/**
 * Validate a magic link token and create a session
 */
export async function validateMagicLinkToken(
  rawToken: string
): Promise<GuideContext | null> {
  // Hash the token to compare with stored value
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");

  // Find the token in the database
  const tokenRecord = await db.query.guideTokens.findFirst({
    where: and(
      eq(guideTokens.token, hashedToken),
      gt(guideTokens.expiresAt, new Date())
    ),
    with: {
      guide: true,
      organization: true,
    },
  });

  if (!tokenRecord) {
    return null;
  }

  // Mark token as used
  await db
    .update(guideTokens)
    .set({
      usedAt: new Date(),
      lastAccessedAt: new Date(),
    })
    .where(eq(guideTokens.id, tokenRecord.id));

  // Create JWT session token
  const sessionToken = await new SignJWT({
    guideId: tokenRecord.guideId,
    organizationId: tokenRecord.organizationId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${TOKEN_EXPIRY_DAYS}d`)
    .setIssuedAt()
    .sign(getJwtSecret());

  // Set the session cookie
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  });

  return {
    guideId: tokenRecord.guideId,
    organizationId: tokenRecord.organizationId,
    guide: tokenRecord.guide,
    organization: tokenRecord.organization,
  };
}

/**
 * Get the current guide context from session
 */
export async function getGuideContext(): Promise<GuideContext | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    // Verify JWT
    const verified = await jwtVerify(token, getJwtSecret());
    const payload = verified.payload as {
      guideId: string;
      organizationId: string;
    };

    // Fetch guide and organization data
    const guide = await db.query.guides.findFirst({
      where: and(
        eq(guides.id, payload.guideId),
        eq(guides.organizationId, payload.organizationId),
        eq(guides.status, "active")
      ),
    });

    if (!guide) {
      return null;
    }

    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, payload.organizationId),
    });

    if (!organization) {
      return null;
    }

    return {
      guideId: payload.guideId,
      organizationId: payload.organizationId,
      guide,
      organization,
    };
  } catch {
    // Token invalid or expired
    return null;
  }
}

/**
 * Logout - clear the session
 */
export async function guideLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Cleanup expired tokens (should be called periodically via a cron job)
 */
export async function cleanupExpiredTokens() {
  await db.delete(guideTokens).where(lt(guideTokens.expiresAt, new Date()));
}
