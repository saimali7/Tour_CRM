import crypto from "node:crypto";

interface MagicLinkPayload {
  organizationId: string;
  referenceNumber: string;
  email: string;
  expiresAt: number;
}

const DEFAULT_TTL_MINUTES = 30;
const DEV_FALLBACK_SECRET = "booking-magic-link-dev-secret";

function getMagicSecret(): string {
  const configured = process.env.BOOKING_MAGIC_LINK_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BOOKING_MAGIC_LINK_SECRET must be configured in production");
  }

  return DEV_FALLBACK_SECRET;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadBase64: string): string {
  return crypto
    .createHmac("sha256", getMagicSecret())
    .update(payloadBase64)
    .digest("base64url");
}

export function createBookingMagicToken(input: {
  organizationId: string;
  referenceNumber: string;
  email: string;
  ttlMinutes?: number;
}): string {
  const payload: MagicLinkPayload = {
    organizationId: input.organizationId,
    referenceNumber: input.referenceNumber.toUpperCase(),
    email: input.email.toLowerCase(),
    expiresAt: Date.now() + (input.ttlMinutes || DEFAULT_TTL_MINUTES) * 60_000,
  };

  const payloadBase64 = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function verifyBookingMagicToken(token: string): MagicLinkPayload {
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) {
    throw new Error("Invalid magic link token");
  }

  const expectedSignature = signPayload(payloadBase64);
  const given = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new Error("Invalid magic link signature");
  }

  let payload: MagicLinkPayload;
  try {
    payload = JSON.parse(decodeBase64Url(payloadBase64)) as MagicLinkPayload;
  } catch {
    throw new Error("Invalid magic link payload");
  }

  if (!payload.organizationId || !payload.referenceNumber || !payload.email || !payload.expiresAt) {
    throw new Error("Invalid magic link payload");
  }

  if (payload.expiresAt < Date.now()) {
    throw new Error("Magic link has expired");
  }

  return payload;
}
