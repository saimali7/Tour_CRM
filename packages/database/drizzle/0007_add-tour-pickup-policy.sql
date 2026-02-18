ALTER TABLE "tours"
  ADD COLUMN IF NOT EXISTS "pickup_mode" text DEFAULT 'meeting_point';

ALTER TABLE "tours"
  ADD COLUMN IF NOT EXISTS "pickup_allowed_cities" jsonb DEFAULT '[]'::jsonb;

ALTER TABLE "tours"
  ADD COLUMN IF NOT EXISTS "pickup_airport_allowed" boolean DEFAULT false;

ALTER TABLE "tours"
  ADD COLUMN IF NOT EXISTS "pickup_policy_notes" text;

UPDATE "tours"
SET "pickup_mode" = 'meeting_point'
WHERE "pickup_mode" IS NULL;

UPDATE "tours"
SET "pickup_allowed_cities" = '[]'::jsonb
WHERE "pickup_allowed_cities" IS NULL;

UPDATE "tours"
SET "pickup_airport_allowed" = false
WHERE "pickup_airport_allowed" IS NULL;
