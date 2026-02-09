ALTER TABLE "guide_assignments" ADD COLUMN IF NOT EXISTS "is_lead_guide" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "guide_assignments" ADD COLUMN IF NOT EXISTS "pickup_order" integer;
--> statement-breakpoint
ALTER TABLE "guide_assignments" ADD COLUMN IF NOT EXISTS "calculated_pickup_time" text;
--> statement-breakpoint
ALTER TABLE "guide_assignments" ADD COLUMN IF NOT EXISTS "drive_time_minutes" integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guide_assignments_guide_org_idx" ON "guide_assignments" USING btree ("guide_id","organization_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pickup_zones" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "color" text NOT NULL,
  "center_lat" numeric(10, 7),
  "center_lng" numeric(10, 7),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pickup_zones_org_idx" ON "pickup_zones" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pickup_zones_org_name_unique" ON "pickup_zones" USING btree ("organization_id","name");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "zone_travel_times" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "from_zone_id" text NOT NULL REFERENCES "public"."pickup_zones"("id") ON DELETE cascade,
  "to_zone_id" text NOT NULL REFERENCES "public"."pickup_zones"("id") ON DELETE cascade,
  "estimated_minutes" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "zone_travel_times_org_idx" ON "zone_travel_times" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "zone_travel_times_from_zone_idx" ON "zone_travel_times" USING btree ("from_zone_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "zone_travel_times_to_zone_idx" ON "zone_travel_times" USING btree ("to_zone_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "zone_travel_times_org_zones_unique" ON "zone_travel_times" USING btree ("organization_id","from_zone_id","to_zone_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pickup_addresses" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "short_name" text,
  "address" text NOT NULL,
  "zone" text,
  "latitude" numeric(10, 7),
  "longitude" numeric(10, 7),
  "pickup_instructions" text,
  "average_pickup_minutes" integer DEFAULT 5,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pickup_addresses_organization_id_name_unique" ON "pickup_addresses" USING btree ("organization_id","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pickup_addresses_org_idx" ON "pickup_addresses" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pickup_addresses_org_zone_idx" ON "pickup_addresses" USING btree ("organization_id","zone");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pickup_addresses_org_active_idx" ON "pickup_addresses" USING btree ("organization_id","is_active");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pickup_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "schedule_id" text,
  "guide_assignment_id" text NOT NULL REFERENCES "public"."guide_assignments"("id") ON DELETE cascade,
  "booking_id" text NOT NULL REFERENCES "public"."bookings"("id") ON DELETE cascade,
  "pickup_address_id" text REFERENCES "public"."pickup_addresses"("id") ON DELETE set null,
  "pickup_order" integer NOT NULL,
  "estimated_pickup_time" timestamp with time zone,
  "actual_pickup_time" timestamp with time zone,
  "passenger_count" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pickup_assignments_organization_id_schedule_id_booking_id_unique" ON "pickup_assignments" USING btree ("organization_id","schedule_id","booking_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pickup_assignments_schedule_idx" ON "pickup_assignments" USING btree ("schedule_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pickup_assignments_guide_assignment_idx" ON "pickup_assignments" USING btree ("guide_assignment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pickup_assignments_booking_idx" ON "pickup_assignments" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pickup_assignments_org_status_idx" ON "pickup_assignments" USING btree ("organization_id","status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "dispatch_status" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "dispatch_date" date NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "optimized_at" timestamp with time zone,
  "dispatched_at" timestamp with time zone,
  "dispatched_by" text REFERENCES "public"."users"("id") ON DELETE set null,
  "total_guests" integer,
  "total_guides" integer,
  "total_drive_minutes" integer,
  "efficiency_score" numeric(5, 2),
  "unresolved_warnings" integer DEFAULT 0 NOT NULL,
  "warnings" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dispatch_status_org_idx" ON "dispatch_status" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dispatch_status_date_idx" ON "dispatch_status" USING btree ("dispatch_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dispatch_status_status_idx" ON "dispatch_status" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dispatch_status_org_date_unique" ON "dispatch_status" USING btree ("organization_id","dispatch_date");
