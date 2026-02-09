ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_zone_id" text;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_location" text;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_address" text;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_lat" numeric(10, 7);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_lng" numeric(10, 7);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_time" text;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_notes" text;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "special_occasion" text;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "assigned_guide_id" text;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "assigned_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "is_first_time" boolean DEFAULT false;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "bookings_pickup_zone_idx" ON "bookings" USING btree ("pickup_zone_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_assigned_guide_idx" ON "bookings" USING btree ("assigned_guide_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_guide_date_idx" ON "bookings" USING btree ("assigned_guide_id", "booking_date");
