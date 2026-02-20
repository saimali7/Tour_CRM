import crypto from "node:crypto";
import { and, checkoutAttempts, db, eq } from "@tour/database";

export type CheckoutReusePayload = {
  paymentUrl: string;
  paymentAmount: string;
  remainingBalance: string;
  paymentMode: "deposit" | "full";
  bookingId: string | null;
  bookingReference: string | null;
};

type CheckoutAttemptMetadata = {
  paymentUrl?: string;
  paymentAmount?: string;
  remainingBalance?: string;
  paymentMode?: "deposit" | "full";
  bookingReference?: string;
  createdAt?: string;
};

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
    .join(",")}}`;
}

export function hashCheckoutFingerprint(input: unknown): string {
  return crypto.createHash("sha256").update(stableSerialize(input)).digest("hex");
}

export function isValidIdempotencyKey(idempotencyKey: string | null): boolean {
  if (!idempotencyKey) return false;
  const normalized = idempotencyKey.trim();
  if (normalized.length < 16 || normalized.length > 120) return false;
  return /^[A-Za-z0-9:_-]+$/.test(normalized);
}

export async function reserveCheckoutAttempt(params: {
  organizationId: string;
  idempotencyKey: string;
  fingerprintHash: string;
  amountCents: number;
  currency: string;
  expiresAt: Date;
}): Promise<{
  attempt: typeof checkoutAttempts.$inferSelect;
  created: boolean;
}> {
  const inserted = await db
    .insert(checkoutAttempts)
    .values({
      organizationId: params.organizationId,
      idempotencyKey: params.idempotencyKey,
      fingerprintHash: params.fingerprintHash,
      amountCents: params.amountCents,
      currency: params.currency,
      status: "initiated",
      expiresAt: params.expiresAt,
      metadata: { createdAt: new Date().toISOString() },
    })
    .onConflictDoNothing({
      target: [checkoutAttempts.organizationId, checkoutAttempts.idempotencyKey],
    })
    .returning();

  const [attempt] = inserted.length
    ? inserted
    : await db
        .select()
        .from(checkoutAttempts)
        .where(
          and(
            eq(checkoutAttempts.organizationId, params.organizationId),
            eq(checkoutAttempts.idempotencyKey, params.idempotencyKey)
          )
        )
        .limit(1);

  if (!attempt) {
    throw new Error("Failed to reserve checkout attempt");
  }

  return {
    attempt,
    created: inserted.length > 0,
  };
}

export async function attachBookingToAttempt(params: {
  organizationId: string;
  attemptId: string;
  bookingId: string;
}) {
  await db
    .update(checkoutAttempts)
    .set({
      bookingId: params.bookingId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutAttempts.id, params.attemptId),
        eq(checkoutAttempts.organizationId, params.organizationId)
      )
    );
}

export async function markCheckoutSessionCreated(params: {
  organizationId: string;
  attemptId: string;
  bookingId: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string | null;
  paymentUrl: string;
  paymentAmount: string;
  remainingBalance: string;
  paymentMode: "deposit" | "full";
  bookingReference: string;
}) {
  const metadata: CheckoutAttemptMetadata = {
    paymentUrl: params.paymentUrl,
    paymentAmount: params.paymentAmount,
    remainingBalance: params.remainingBalance,
    paymentMode: params.paymentMode,
    bookingReference: params.bookingReference,
    createdAt: new Date().toISOString(),
  };

  await db
    .update(checkoutAttempts)
    .set({
      bookingId: params.bookingId,
      stripeSessionId: params.stripeSessionId,
      stripePaymentIntentId: params.stripePaymentIntentId ?? null,
      status: "session_created",
      metadata,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutAttempts.id, params.attemptId),
        eq(checkoutAttempts.organizationId, params.organizationId)
      )
    );
}

export async function markCheckoutAttemptFailure(params: {
  organizationId: string;
  attemptId: string;
  errorMessage: string;
}) {
  await db
    .update(checkoutAttempts)
    .set({
      status: "failed",
      lastError: params.errorMessage.slice(0, 1000),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutAttempts.id, params.attemptId),
        eq(checkoutAttempts.organizationId, params.organizationId)
      )
    );
}

export async function markCheckoutAttemptPaid(params: {
  organizationId: string;
  bookingId: string;
  stripePaymentIntentId?: string | null;
}) {
  await db
    .update(checkoutAttempts)
    .set({
      status: "paid",
      stripePaymentIntentId: params.stripePaymentIntentId ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutAttempts.organizationId, params.organizationId),
        eq(checkoutAttempts.bookingId, params.bookingId)
      )
    );
}

export async function markCheckoutAttemptExpired(params: {
  organizationId: string;
  bookingId: string;
}) {
  await db
    .update(checkoutAttempts)
    .set({
      status: "expired",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutAttempts.organizationId, params.organizationId),
        eq(checkoutAttempts.bookingId, params.bookingId)
      )
    );
}

export function getCheckoutReusePayload(
  attempt: typeof checkoutAttempts.$inferSelect
): CheckoutReusePayload | null {
  const metadata = (attempt.metadata ?? null) as CheckoutAttemptMetadata | null;
  if (!metadata?.paymentUrl || !metadata.paymentAmount || !metadata.remainingBalance || !metadata.paymentMode) {
    return null;
  }

  return {
    paymentUrl: metadata.paymentUrl,
    paymentAmount: metadata.paymentAmount,
    remainingBalance: metadata.remainingBalance,
    paymentMode: metadata.paymentMode,
    bookingId: attempt.bookingId ?? null,
    bookingReference: metadata.bookingReference ?? null,
  };
}

export async function getCheckoutAttemptByIdempotency(params: {
  organizationId: string;
  idempotencyKey: string;
}) {
  const [attempt] = await db
    .select()
    .from(checkoutAttempts)
    .where(
      and(
        eq(checkoutAttempts.organizationId, params.organizationId),
        eq(checkoutAttempts.idempotencyKey, params.idempotencyKey)
      )
    )
    .limit(1);
  return attempt ?? null;
}

export async function getCheckoutAttemptByBooking(params: {
  organizationId: string;
  bookingId: string;
}) {
  const [attempt] = await db
    .select()
    .from(checkoutAttempts)
    .where(
      and(
        eq(checkoutAttempts.organizationId, params.organizationId),
        eq(checkoutAttempts.bookingId, params.bookingId)
      )
    )
    .limit(1);
  return attempt ?? null;
}
