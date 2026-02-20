CREATE TABLE IF NOT EXISTS "checkout_attempts" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "booking_id" text REFERENCES "bookings"("id") ON DELETE SET NULL,
  "idempotency_key" text NOT NULL,
  "fingerprint_hash" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "currency" text NOT NULL,
  "stripe_session_id" text,
  "stripe_payment_intent_id" text,
  "status" text NOT NULL DEFAULT 'initiated',
  "last_error" text,
  "metadata" jsonb,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "event_id" text NOT NULL,
  "type" text NOT NULL,
  "organization_id" text REFERENCES "organizations"("id") ON DELETE CASCADE,
  "booking_id" text REFERENCES "bookings"("id") ON DELETE SET NULL,
  "metadata" jsonb,
  "processed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "checkout_attempts_org_idempotency_key_unique"
  ON "checkout_attempts" ("organization_id", "idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "checkout_attempts_org_stripe_session_id_unique"
  ON "checkout_attempts" ("organization_id", "stripe_session_id");
CREATE INDEX IF NOT EXISTS "checkout_attempts_org_idx"
  ON "checkout_attempts" ("organization_id");
CREATE INDEX IF NOT EXISTS "checkout_attempts_booking_idx"
  ON "checkout_attempts" ("booking_id");
CREATE INDEX IF NOT EXISTS "checkout_attempts_status_idx"
  ON "checkout_attempts" ("status");
CREATE INDEX IF NOT EXISTS "checkout_attempts_org_status_idx"
  ON "checkout_attempts" ("organization_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "stripe_webhook_events_event_id_unique"
  ON "stripe_webhook_events" ("event_id");
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_type_idx"
  ON "stripe_webhook_events" ("type");
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_org_idx"
  ON "stripe_webhook_events" ("organization_id");
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_booking_idx"
  ON "stripe_webhook_events" ("booking_id");
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_processed_at_idx"
  ON "stripe_webhook_events" ("processed_at");
