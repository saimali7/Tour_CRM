CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "source" text DEFAULT 'system' NOT NULL,
  "category" text DEFAULT 'system' NOT NULL,
  "severity" text DEFAULT 'info' NOT NULL,
  "dedupe_key" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "action_url" text,
  "action_label" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "read_at" timestamp with time zone,
  "archived_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_org_user_dedupe_unique"
  UNIQUE ("organization_id", "user_id", "dedupe_key");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notifications_org_idx"
  ON "notifications" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx"
  ON "notifications" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_severity_idx"
  ON "notifications" USING btree ("severity");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx"
  ON "notifications" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_org_user_created_idx"
  ON "notifications" USING btree ("organization_id", "user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_unread_idx"
  ON "notifications" USING btree ("organization_id", "user_id", "read_at");
