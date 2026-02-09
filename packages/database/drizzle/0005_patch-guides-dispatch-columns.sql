ALTER TABLE "guides" ADD COLUMN IF NOT EXISTS "vehicle_capacity" integer DEFAULT 6 NOT NULL;
--> statement-breakpoint
ALTER TABLE "guides" ADD COLUMN IF NOT EXISTS "vehicle_description" text;
--> statement-breakpoint
ALTER TABLE "guides" ADD COLUMN IF NOT EXISTS "base_zone_id" text;
--> statement-breakpoint
ALTER TABLE "guides" ADD COLUMN IF NOT EXISTS "vehicle_type" text;
--> statement-breakpoint
ALTER TABLE "guides" ADD COLUMN IF NOT EXISTS "preferred_zones" jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "guides_base_zone_idx" ON "guides" USING btree ("base_zone_id");
--> statement-breakpoint

DO $$
BEGIN
  IF
    to_regclass('public.pickup_zones') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'guides_base_zone_id_pickup_zones_id_fk'
    )
  THEN
    ALTER TABLE "guides"
      ADD CONSTRAINT "guides_base_zone_id_pickup_zones_id_fk"
      FOREIGN KEY ("base_zone_id")
      REFERENCES "public"."pickup_zones"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END
$$;
