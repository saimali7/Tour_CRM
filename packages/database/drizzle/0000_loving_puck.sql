CREATE TYPE "public"."goal_metric_type" AS ENUM('revenue', 'bookings', 'capacity_utilization', 'new_customers');--> statement-breakpoint
CREATE TYPE "public"."goal_period_type" AS ENUM('monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'missed');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"website" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#0066FF',
	"settings" jsonb DEFAULT '{}'::jsonb,
	"stripe_customer_id" text,
	"stripe_connect_account_id" text,
	"stripe_connect_onboarded" boolean DEFAULT false,
	"status" text DEFAULT 'active' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'support' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_unique" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"avatar_url" text,
	"phone" text,
	"is_super_admin" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sign_in_at" timestamp with time zone,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"contact_preference" text DEFAULT 'email',
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"language" text DEFAULT 'en',
	"currency" text DEFAULT 'USD',
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"source" text DEFAULT 'manual',
	"source_details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_organization_id_email_unique" UNIQUE("organization_id","email")
);
--> statement-breakpoint
CREATE TABLE "tour_pricing_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"min_age" integer,
	"max_age" integer,
	"is_default" boolean DEFAULT false,
	"counts_towards_capacity" boolean DEFAULT true,
	"min_quantity" integer DEFAULT 0,
	"max_quantity" integer,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_pricing_tiers_tour_id_name_unique" UNIQUE("tour_id","name")
);
--> statement-breakpoint
CREATE TABLE "tour_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"price_modifier_type" text DEFAULT 'absolute',
	"price_modifier" numeric(10, 2),
	"duration_minutes" integer,
	"max_participants" integer,
	"min_participants" integer,
	"available_days" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
	"default_start_time" text,
	"sort_order" integer DEFAULT 0,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_variants_tour_id_name_unique" UNIQUE("tour_id","name")
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"short_description" text,
	"duration_minutes" integer NOT NULL,
	"min_participants" integer DEFAULT 1,
	"max_participants" integer NOT NULL,
	"guests_per_guide" integer DEFAULT 6 NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD',
	"meeting_point" text,
	"meeting_point_details" text,
	"meeting_point_lat" numeric(10, 7),
	"meeting_point_lng" numeric(10, 7),
	"cover_image_url" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"category" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"includes" jsonb DEFAULT '[]'::jsonb,
	"excludes" jsonb DEFAULT '[]'::jsonb,
	"requirements" jsonb DEFAULT '[]'::jsonb,
	"accessibility" text,
	"cancellation_policy" text,
	"cancellation_hours" integer DEFAULT 24,
	"minimum_notice_hours" integer DEFAULT 2,
	"maximum_advance_days" integer DEFAULT 90,
	"allow_same_day_booking" boolean DEFAULT true,
	"same_day_cutoff_time" text,
	"deposit_enabled" boolean DEFAULT false,
	"deposit_type" text DEFAULT 'percentage',
	"deposit_amount" numeric(10, 2),
	"balance_due_days" integer DEFAULT 0,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_public" boolean DEFAULT false,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "tours_organization_id_slug_unique" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
CREATE TABLE "tour_availability_windows" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"name" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"days_of_week" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb NOT NULL,
	"max_participants_override" integer,
	"price_override" numeric(10, 2),
	"meeting_point_override" text,
	"meeting_point_details_override" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_blackout_dates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"date" date NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_blackout_dates_tour_date_unique" UNIQUE("tour_id","date")
);
--> statement-breakpoint
CREATE TABLE "tour_departure_times" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"time" text NOT NULL,
	"label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_departure_times_tour_time_unique" UNIQUE("tour_id","time")
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"bio" text,
	"short_bio" text,
	"languages" jsonb DEFAULT '["en"]'::jsonb,
	"certifications" jsonb DEFAULT '[]'::jsonb,
	"availability_notes" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"is_public" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"max_participants" integer NOT NULL,
	"booked_count" integer DEFAULT 0,
	"guides_required" integer DEFAULT 0 NOT NULL,
	"guides_assigned" integer DEFAULT 0 NOT NULL,
	"price" numeric(10, 2),
	"currency" text,
	"meeting_point" text,
	"meeting_point_details" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"internal_notes" text,
	"public_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"type" text DEFAULT 'adult' NOT NULL,
	"dietary_requirements" text,
	"accessibility_needs" text,
	"notes" text,
	"checked_in" text DEFAULT 'no',
	"checked_in_at" timestamp with time zone,
	"checked_in_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"reference_number" text NOT NULL,
	"customer_id" text NOT NULL,
	"schedule_id" text,
	"tour_id" text,
	"booking_date" date,
	"booking_time" text,
	"booking_option_id" text,
	"guest_adults" integer,
	"guest_children" integer,
	"guest_infants" integer,
	"units_booked" integer,
	"pricing_snapshot" jsonb,
	"adult_count" integer DEFAULT 1 NOT NULL,
	"child_count" integer DEFAULT 0,
	"infant_count" integer DEFAULT 0,
	"total_participants" integer NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0',
	"tax" numeric(10, 2) DEFAULT '0',
	"total" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0',
	"stripe_payment_intent_id" text,
	"deposit_required" numeric(10, 2),
	"deposit_paid" numeric(10, 2) DEFAULT '0',
	"deposit_paid_at" timestamp with time zone,
	"balance_due_date" timestamp with time zone,
	"balance_paid_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_details" text,
	"special_requests" text,
	"dietary_requirements" text,
	"accessibility_needs" text,
	"internal_notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_organization_id_reference_number_unique" UNIQUE("organization_id","reference_number")
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_name" text,
	"description" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"changes" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text DEFAULT 'customer_request' NOT NULL,
	"reason_details" text,
	"stripe_refund_id" text,
	"stripe_payment_intent_id" text,
	"stripe_error_message" text,
	"processed_by" text,
	"processed_by_name" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"notes" text,
	"recorded_by" text NOT NULL,
	"recorded_by_name" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "abandoned_carts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text,
	"email" text NOT NULL,
	"phone" text,
	"first_name" text,
	"last_name" text,
	"tour_id" text NOT NULL,
	"schedule_id" text,
	"adult_count" integer DEFAULT 1,
	"child_count" integer DEFAULT 0,
	"infant_count" integer DEFAULT 0,
	"subtotal" numeric(10, 2),
	"total" numeric(10, 2),
	"currency" text DEFAULT 'USD',
	"last_step" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"recovery_token" text,
	"emails_sent" integer DEFAULT 0,
	"last_email_sent_at" timestamp with time zone,
	"sms_sent" boolean DEFAULT false,
	"recovered_at" timestamp with time zone,
	"recovered_booking_id" text,
	"discount_applied" text,
	"session_id" text,
	"user_agent" text,
	"ip_address" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"cart_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text,
	"email" text NOT NULL,
	"phone" text,
	"tour_id" text NOT NULL,
	"schedule_id" text,
	"requested_spots" integer DEFAULT 1,
	"status" text DEFAULT 'active' NOT NULL,
	"notified_at" timestamp with time zone,
	"notification_count" integer DEFAULT 0,
	"booked_at" timestamp with time zone,
	"booking_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "communication_automations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"automation_type" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"is_active" boolean DEFAULT true,
	"delay_minutes" integer,
	"delay_hours" integer,
	"delay_days" integer,
	"timing_type" text DEFAULT 'immediate',
	"email_template_id" text,
	"sms_template_id" text,
	"include_discount" boolean DEFAULT false,
	"discount_code" text,
	"discount_percentage" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communication_automations_organization_id_automation_type_unique" UNIQUE("organization_id","automation_type")
);
--> statement-breakpoint
CREATE TABLE "communication_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text,
	"recipient_email" text,
	"recipient_phone" text,
	"recipient_name" text,
	"booking_id" text,
	"tour_id" text,
	"schedule_id" text,
	"type" text NOT NULL,
	"template_id" text,
	"template_name" text,
	"subject" text,
	"content" text NOT NULL,
	"content_plain" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"status_details" text,
	"external_id" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"content" text NOT NULL,
	"is_pinned" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"content_html" text NOT NULL,
	"content_plain" text,
	"available_variables" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_templates_organization_id_type_unique" UNIQUE("organization_id","type")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"email_booking_confirmation" boolean DEFAULT true,
	"email_booking_reminder" boolean DEFAULT true,
	"email_booking_changes" boolean DEFAULT true,
	"email_review_request" boolean DEFAULT true,
	"email_marketing" boolean DEFAULT true,
	"email_price_alerts" boolean DEFAULT true,
	"email_availability_alerts" boolean DEFAULT true,
	"email_wishlist_digest" boolean DEFAULT true,
	"email_abandoned_cart" boolean DEFAULT true,
	"sms_booking_confirmation" boolean DEFAULT true,
	"sms_booking_reminder" boolean DEFAULT true,
	"sms_booking_changes" boolean DEFAULT true,
	"sms_marketing" boolean DEFAULT false,
	"email_unsubscribed_at" timestamp with time zone,
	"sms_unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_organization_id_customer_id_unique" UNIQUE("organization_id","customer_id")
);
--> statement-breakpoint
CREATE TABLE "sms_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"available_variables" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_templates_organization_id_type_unique" UNIQUE("organization_id","type")
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text,
	"email" text,
	"session_id" text,
	"tour_id" text NOT NULL,
	"price_drop_alert" boolean DEFAULT true,
	"availability_alert" boolean DEFAULT true,
	"original_price" numeric(10, 2),
	"last_notified_at" timestamp with time zone,
	"notification_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlists_organization_id_customer_id_tour_id_unique" UNIQUE("organization_id","customer_id","tour_id")
);
--> statement-breakpoint
CREATE TABLE "guide_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"guide_id" text,
	"outsourced_guide_name" text,
	"outsourced_guide_contact" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"decline_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"guide_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_availability_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"guide_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"is_available" boolean NOT NULL,
	"start_time" text,
	"end_time" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_availability_overrides_guide_id_date_unique" UNIQUE("guide_id","date")
);
--> statement-breakpoint
CREATE TABLE "tour_guide_qualifications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"guide_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_guide_qualifications_tour_id_guide_id_unique" UNIQUE("tour_id","guide_id")
);
--> statement-breakpoint
CREATE TABLE "guide_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"guide_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "group_discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"min_participants" integer NOT NULL,
	"max_participants" integer,
	"discount_type" text NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"applies_to" text DEFAULT 'all' NOT NULL,
	"tour_ids" text[],
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_code_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"promo_code_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"discount_amount" numeric(10, 2) NOT NULL,
	"original_amount" numeric(10, 2) NOT NULL,
	"final_amount" numeric(10, 2) NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"discount_type" text NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"max_uses" integer,
	"max_uses_per_customer" integer,
	"current_uses" integer DEFAULT 0,
	"min_booking_amount" numeric(10, 2),
	"applies_to" text DEFAULT 'all' NOT NULL,
	"tour_ids" text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "seasonal_pricing" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"adjustment_type" text NOT NULL,
	"adjustment_value" numeric(10, 2) NOT NULL,
	"applies_to" text DEFAULT 'all' NOT NULL,
	"tour_ids" text[],
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"guide_id" text,
	"overall_rating" integer NOT NULL,
	"tour_rating" integer,
	"guide_rating" integer,
	"value_rating" integer,
	"comment" text,
	"highlights_liked" text,
	"improvement_suggestions" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT true NOT NULL,
	"platform" text DEFAULT 'internal' NOT NULL,
	"external_review_url" text,
	"external_review_posted" boolean DEFAULT false,
	"response_text" text,
	"responded_at" timestamp with time zone,
	"responded_by" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"request_sent_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "signed_waivers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"waiver_template_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"participant_id" text,
	"signed_by_name" text NOT NULL,
	"signed_by_email" text,
	"signed_by_phone" text,
	"signature_data" text,
	"signature_type" text DEFAULT 'typed',
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relationship" text,
	"health_info" jsonb,
	"date_of_birth" timestamp with time zone,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"waiver_version_at_signing" text,
	"waiver_content_at_signing" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signed_waivers_booking_id_waiver_template_id_participant_id_unique" UNIQUE("booking_id","waiver_template_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "tour_waivers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"waiver_template_id" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_waivers_tour_id_waiver_template_id_unique" UNIQUE("tour_id","waiver_template_id")
);
--> statement-breakpoint
CREATE TABLE "waiver_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"requires_signature" boolean DEFAULT true NOT NULL,
	"requires_initials" boolean DEFAULT false,
	"requires_emergency_contact" boolean DEFAULT false,
	"requires_date_of_birth" boolean DEFAULT false,
	"requires_health_info" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" text DEFAULT '1.0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waiver_templates_organization_id_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "add_on_products" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"short_description" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD',
	"type" text DEFAULT 'per_booking' NOT NULL,
	"min_quantity" integer DEFAULT 1,
	"max_quantity" integer,
	"track_inventory" boolean DEFAULT false,
	"inventory_count" integer,
	"image_url" text,
	"category" text,
	"requires_info" boolean DEFAULT false,
	"info_prompt" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_add_ons" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"add_on_product_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"additional_info" text,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"type" text DEFAULT 'monetary' NOT NULL,
	"monetary_value" numeric(10, 2),
	"percentage_value" integer,
	"tour_id" text,
	"remaining_value" numeric(10, 2),
	"purchaser_name" text,
	"purchaser_email" text,
	"purchaser_phone" text,
	"recipient_name" text,
	"recipient_email" text,
	"personal_message" text,
	"delivery_method" text DEFAULT 'email' NOT NULL,
	"delivered_at" timestamp with time zone,
	"purchase_amount" numeric(10, 2),
	"stripe_payment_intent_id" text,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"redeemed_at" timestamp with time zone,
	"redeemed_booking_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_vouchers_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "tour_add_ons" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"add_on_product_id" text NOT NULL,
	"price_override" numeric(10, 2),
	"pricing_structure" jsonb,
	"applicable_options" jsonb,
	"requires" jsonb,
	"excludes" jsonb,
	"included_in" jsonb,
	"deadline_hours" integer,
	"is_required" boolean DEFAULT false,
	"is_recommended" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_add_ons_tour_id_add_on_product_id_unique" UNIQUE("tour_id","add_on_product_id")
);
--> statement-breakpoint
CREATE TABLE "voucher_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"voucher_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"amount_redeemed" numeric(10, 2) NOT NULL,
	"remaining_after" numeric(10, 2) NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"metric_type" "goal_metric_type" NOT NULL,
	"target_value" numeric(12, 2) NOT NULL,
	"period_type" "goal_period_type" NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"current_value" numeric(12, 2) DEFAULT '0',
	"last_calculated_at" timestamp with time zone,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_options" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text,
	"full_description" text,
	"badge" text,
	"highlight_text" text,
	"pricing_model" jsonb NOT NULL,
	"capacity_model" jsonb NOT NULL,
	"scheduling_type" text DEFAULT 'fixed',
	"is_default" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"status" text DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_options_tour_id_name_unique" UNIQUE("tour_id","name")
);
--> statement-breakpoint
CREATE TABLE "schedule_option_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"booking_option_id" text NOT NULL,
	"total_seats" integer,
	"booked_seats" integer DEFAULT 0,
	"total_units" integer,
	"booked_units" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_option_availability_schedule_id_booking_option_id_unique" UNIQUE("schedule_id","booking_option_id")
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"schedule_id" text NOT NULL,
	"booking_option_id" text,
	"customer_id" text,
	"email" text NOT NULL,
	"phone" text,
	"adults" integer NOT NULL,
	"children" integer DEFAULT 0,
	"infants" integer DEFAULT 0,
	"status" text DEFAULT 'waiting',
	"notified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"converted_booking_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_pricing_tiers" ADD CONSTRAINT "tour_pricing_tiers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_pricing_tiers" ADD CONSTRAINT "tour_pricing_tiers_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_variants" ADD CONSTRAINT "tour_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_variants" ADD CONSTRAINT "tour_variants_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_availability_windows" ADD CONSTRAINT "tour_availability_windows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_availability_windows" ADD CONSTRAINT "tour_availability_windows_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_blackout_dates" ADD CONSTRAINT "tour_blackout_dates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_blackout_dates" ADD CONSTRAINT "tour_blackout_dates_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_departure_times" ADD CONSTRAINT "tour_departure_times_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_departure_times" ADD CONSTRAINT "tour_departure_times_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_recovered_booking_id_bookings_id_fk" FOREIGN KEY ("recovered_booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_alerts" ADD CONSTRAINT "availability_alerts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_alerts" ADD CONSTRAINT "availability_alerts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_alerts" ADD CONSTRAINT "availability_alerts_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_alerts" ADD CONSTRAINT "availability_alerts_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_alerts" ADD CONSTRAINT "availability_alerts_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_automations" ADD CONSTRAINT "communication_automations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_automations" ADD CONSTRAINT "communication_automations_email_template_id_email_templates_id_fk" FOREIGN KEY ("email_template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_automations" ADD CONSTRAINT "communication_automations_sms_template_id_sms_templates_id_fk" FOREIGN KEY ("sms_template_id") REFERENCES "public"."sms_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_templates" ADD CONSTRAINT "sms_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_assignments" ADD CONSTRAINT "guide_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_assignments" ADD CONSTRAINT "guide_assignments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_assignments" ADD CONSTRAINT "guide_assignments_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_availability" ADD CONSTRAINT "guide_availability_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_availability" ADD CONSTRAINT "guide_availability_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_availability_overrides" ADD CONSTRAINT "guide_availability_overrides_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_availability_overrides" ADD CONSTRAINT "guide_availability_overrides_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_guide_qualifications" ADD CONSTRAINT "tour_guide_qualifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_guide_qualifications" ADD CONSTRAINT "tour_guide_qualifications_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_guide_qualifications" ADD CONSTRAINT "tour_guide_qualifications_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_tokens" ADD CONSTRAINT "guide_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_tokens" ADD CONSTRAINT "guide_tokens_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_discounts" ADD CONSTRAINT "group_discounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_usage" ADD CONSTRAINT "promo_code_usage_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_usage" ADD CONSTRAINT "promo_code_usage_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_usage" ADD CONSTRAINT "promo_code_usage_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_usage" ADD CONSTRAINT "promo_code_usage_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasonal_pricing" ADD CONSTRAINT "seasonal_pricing_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_waivers" ADD CONSTRAINT "signed_waivers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_waivers" ADD CONSTRAINT "signed_waivers_waiver_template_id_waiver_templates_id_fk" FOREIGN KEY ("waiver_template_id") REFERENCES "public"."waiver_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_waivers" ADD CONSTRAINT "signed_waivers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_waivers" ADD CONSTRAINT "signed_waivers_participant_id_booking_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."booking_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_waivers" ADD CONSTRAINT "tour_waivers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_waivers" ADD CONSTRAINT "tour_waivers_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_waivers" ADD CONSTRAINT "tour_waivers_waiver_template_id_waiver_templates_id_fk" FOREIGN KEY ("waiver_template_id") REFERENCES "public"."waiver_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_templates" ADD CONSTRAINT "waiver_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "add_on_products" ADD CONSTRAINT "add_on_products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_add_ons" ADD CONSTRAINT "booking_add_ons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_add_ons" ADD CONSTRAINT "booking_add_ons_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_add_ons" ADD CONSTRAINT "booking_add_ons_add_on_product_id_add_on_products_id_fk" FOREIGN KEY ("add_on_product_id") REFERENCES "public"."add_on_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_vouchers" ADD CONSTRAINT "gift_vouchers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_vouchers" ADD CONSTRAINT "gift_vouchers_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_vouchers" ADD CONSTRAINT "gift_vouchers_redeemed_booking_id_bookings_id_fk" FOREIGN KEY ("redeemed_booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_add_ons" ADD CONSTRAINT "tour_add_ons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_add_ons" ADD CONSTRAINT "tour_add_ons_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_add_ons" ADD CONSTRAINT "tour_add_ons_add_on_product_id_add_on_products_id_fk" FOREIGN KEY ("add_on_product_id") REFERENCES "public"."add_on_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_gift_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."gift_vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_options" ADD CONSTRAINT "booking_options_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_options" ADD CONSTRAINT "booking_options_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_option_availability" ADD CONSTRAINT "schedule_option_availability_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_option_availability" ADD CONSTRAINT "schedule_option_availability_booking_option_id_booking_options_id_fk" FOREIGN KEY ("booking_option_id") REFERENCES "public"."booking_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_booking_option_id_booking_options_id_fk" FOREIGN KEY ("booking_option_id") REFERENCES "public"."booking_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_converted_booking_id_bookings_id_fk" FOREIGN KEY ("converted_booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_members_org_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_members_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_org_idx" ON "customers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX "pricing_tiers_tour_idx" ON "tour_pricing_tiers" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "pricing_tiers_org_idx" ON "tour_pricing_tiers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "variants_tour_idx" ON "tour_variants" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "variants_org_idx" ON "tour_variants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tours_org_idx" ON "tours" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tours_status_idx" ON "tours" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tours_public_idx" ON "tours" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "tour_availability_windows_org_idx" ON "tour_availability_windows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tour_availability_windows_tour_idx" ON "tour_availability_windows" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "tour_availability_windows_date_range_idx" ON "tour_availability_windows" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "tour_availability_windows_active_idx" ON "tour_availability_windows" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "tour_availability_windows_tour_active_idx" ON "tour_availability_windows" USING btree ("tour_id","is_active");--> statement-breakpoint
CREATE INDEX "tour_blackout_dates_org_idx" ON "tour_blackout_dates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tour_blackout_dates_tour_idx" ON "tour_blackout_dates" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "tour_blackout_dates_date_idx" ON "tour_blackout_dates" USING btree ("date");--> statement-breakpoint
CREATE INDEX "tour_departure_times_org_idx" ON "tour_departure_times" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tour_departure_times_tour_idx" ON "tour_departure_times" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "tour_departure_times_tour_active_idx" ON "tour_departure_times" USING btree ("tour_id","is_active");--> statement-breakpoint
CREATE INDEX "guides_org_idx" ON "guides" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "guides_user_idx" ON "guides" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guides_status_idx" ON "guides" USING btree ("status");--> statement-breakpoint
CREATE INDEX "schedules_org_idx" ON "schedules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "schedules_tour_idx" ON "schedules" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "schedules_starts_at_idx" ON "schedules" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "schedules_status_idx" ON "schedules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "schedules_org_starts_at_idx" ON "schedules" USING btree ("organization_id","starts_at");--> statement-breakpoint
CREATE INDEX "participants_org_idx" ON "booking_participants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "participants_booking_idx" ON "booking_participants" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "participants_checked_in_idx" ON "booking_participants" USING btree ("checked_in");--> statement-breakpoint
CREATE INDEX "bookings_org_idx" ON "bookings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bookings_schedule_idx" ON "bookings" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bookings_org_status_created_idx" ON "bookings" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "bookings_option_idx" ON "bookings" USING btree ("booking_option_id");--> statement-breakpoint
CREATE INDEX "bookings_tour_idx" ON "bookings" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "bookings_booking_date_idx" ON "bookings" USING btree ("booking_date");--> statement-breakpoint
CREATE INDEX "bookings_tour_date_time_idx" ON "bookings" USING btree ("organization_id","tour_id","booking_date","booking_time");--> statement-breakpoint
CREATE INDEX "activity_logs_org_idx" ON "activity_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_logs_actor_idx" ON "activity_logs" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "refunds_org_idx" ON "refunds" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "refunds_booking_idx" ON "refunds" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refunds_created_at_idx" ON "refunds" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_org_idx" ON "payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_org_booking_idx" ON "payments" USING btree ("organization_id","booking_id");--> statement-breakpoint
CREATE INDEX "payments_recorded_at_idx" ON "payments" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "abandoned_carts_org_idx" ON "abandoned_carts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "abandoned_carts_email_idx" ON "abandoned_carts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "abandoned_carts_customer_idx" ON "abandoned_carts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "abandoned_carts_status_idx" ON "abandoned_carts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "abandoned_carts_tour_idx" ON "abandoned_carts" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "abandoned_carts_recovery_token_idx" ON "abandoned_carts" USING btree ("recovery_token");--> statement-breakpoint
CREATE INDEX "abandoned_carts_created_at_idx" ON "abandoned_carts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "availability_alerts_org_idx" ON "availability_alerts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "availability_alerts_email_idx" ON "availability_alerts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "availability_alerts_tour_idx" ON "availability_alerts" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "availability_alerts_schedule_idx" ON "availability_alerts" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "availability_alerts_status_idx" ON "availability_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "communication_automations_org_idx" ON "communication_automations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_logs_org_idx" ON "communication_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_logs_customer_idx" ON "communication_logs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "communication_logs_booking_idx" ON "communication_logs" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "communication_logs_type_idx" ON "communication_logs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "communication_logs_status_idx" ON "communication_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "communication_logs_created_at_idx" ON "communication_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "communication_logs_org_type_created_idx" ON "communication_logs" USING btree ("organization_id","type","created_at");--> statement-breakpoint
CREATE INDEX "customer_notes_org_idx" ON "customer_notes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_notes_customer_idx" ON "customer_notes" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_notes_created_at_idx" ON "customer_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_templates_org_idx" ON "email_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_templates_type_idx" ON "email_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notification_preferences_org_idx" ON "notification_preferences" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sms_templates_org_idx" ON "sms_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sms_templates_type_idx" ON "sms_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "wishlists_org_idx" ON "wishlists" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "wishlists_customer_idx" ON "wishlists" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "wishlists_tour_idx" ON "wishlists" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "wishlists_email_idx" ON "wishlists" USING btree ("email");--> statement-breakpoint
CREATE INDEX "wishlists_session_idx" ON "wishlists" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "guide_assignments_org_idx" ON "guide_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "guide_assignments_booking_idx" ON "guide_assignments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "guide_assignments_guide_idx" ON "guide_assignments" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "guide_assignments_status_idx" ON "guide_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "guide_availability_org_idx" ON "guide_availability" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "guide_availability_guide_idx" ON "guide_availability" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "guide_availability_day_idx" ON "guide_availability" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "guide_availability_overrides_org_idx" ON "guide_availability_overrides" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "guide_availability_overrides_guide_idx" ON "guide_availability_overrides" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "guide_availability_overrides_date_idx" ON "guide_availability_overrides" USING btree ("date");--> statement-breakpoint
CREATE INDEX "tour_guide_qualifications_org_idx" ON "tour_guide_qualifications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tour_guide_qualifications_tour_idx" ON "tour_guide_qualifications" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "tour_guide_qualifications_guide_idx" ON "tour_guide_qualifications" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "guide_tokens_org_idx" ON "guide_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "guide_tokens_guide_idx" ON "guide_tokens" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "guide_tokens_token_idx" ON "guide_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "guide_tokens_expires_idx" ON "guide_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "group_discounts_org_idx" ON "group_discounts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "group_discounts_threshold_idx" ON "group_discounts" USING btree ("min_participants","max_participants");--> statement-breakpoint
CREATE INDEX "group_discounts_active_idx" ON "group_discounts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "promo_code_usage_org_idx" ON "promo_code_usage" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "promo_code_usage_promo_code_idx" ON "promo_code_usage" USING btree ("promo_code_id");--> statement-breakpoint
CREATE INDEX "promo_code_usage_booking_idx" ON "promo_code_usage" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "promo_code_usage_customer_idx" ON "promo_code_usage" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "promo_code_usage_used_at_idx" ON "promo_code_usage" USING btree ("used_at");--> statement-breakpoint
CREATE INDEX "promo_codes_org_idx" ON "promo_codes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "promo_codes_active_idx" ON "promo_codes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "promo_codes_validity_idx" ON "promo_codes" USING btree ("valid_from","valid_until");--> statement-breakpoint
CREATE INDEX "promo_codes_org_validity_idx" ON "promo_codes" USING btree ("organization_id","is_active","valid_from","valid_until");--> statement-breakpoint
CREATE INDEX "seasonal_pricing_org_idx" ON "seasonal_pricing" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "seasonal_pricing_date_idx" ON "seasonal_pricing" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "seasonal_pricing_active_idx" ON "seasonal_pricing" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "reviews_org_idx" ON "reviews" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "reviews_customer_idx" ON "reviews" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "reviews_tour_idx" ON "reviews" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "reviews_guide_idx" ON "reviews" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_rating_idx" ON "reviews" USING btree ("overall_rating");--> statement-breakpoint
CREATE INDEX "reviews_public_idx" ON "reviews" USING btree ("organization_id","is_public");--> statement-breakpoint
CREATE INDEX "signed_waivers_org_idx" ON "signed_waivers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "signed_waivers_booking_idx" ON "signed_waivers" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "signed_waivers_waiver_idx" ON "signed_waivers" USING btree ("waiver_template_id");--> statement-breakpoint
CREATE INDEX "signed_waivers_participant_idx" ON "signed_waivers" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "tour_waivers_org_idx" ON "tour_waivers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tour_waivers_tour_idx" ON "tour_waivers" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "waiver_templates_org_idx" ON "waiver_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "add_on_products_org_idx" ON "add_on_products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "add_on_products_active_idx" ON "add_on_products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "add_on_products_category_idx" ON "add_on_products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "booking_add_ons_booking_idx" ON "booking_add_ons" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_add_ons_add_on_idx" ON "booking_add_ons" USING btree ("add_on_product_id");--> statement-breakpoint
CREATE INDEX "gift_vouchers_org_idx" ON "gift_vouchers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "gift_vouchers_code_idx" ON "gift_vouchers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "gift_vouchers_status_idx" ON "gift_vouchers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gift_vouchers_expires_idx" ON "gift_vouchers" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "gift_vouchers_recipient_email_idx" ON "gift_vouchers" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "tour_add_ons_tour_idx" ON "tour_add_ons" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "tour_add_ons_add_on_idx" ON "tour_add_ons" USING btree ("add_on_product_id");--> statement-breakpoint
CREATE INDEX "voucher_redemptions_voucher_idx" ON "voucher_redemptions" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "voucher_redemptions_booking_idx" ON "voucher_redemptions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "goals_org_idx" ON "goals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_options_org_idx" ON "booking_options" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "booking_options_tour_idx" ON "booking_options" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "booking_options_status_idx" ON "booking_options" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_options_tour_status_idx" ON "booking_options" USING btree ("tour_id","status");--> statement-breakpoint
CREATE INDEX "schedule_option_avail_schedule_idx" ON "schedule_option_availability" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "schedule_option_avail_option_idx" ON "schedule_option_availability" USING btree ("booking_option_id");--> statement-breakpoint
CREATE INDEX "waitlist_org_idx" ON "waitlist_entries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "waitlist_schedule_idx" ON "waitlist_entries" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "waitlist_status_idx" ON "waitlist_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "waitlist_schedule_status_idx" ON "waitlist_entries" USING btree ("schedule_id","status");--> statement-breakpoint
CREATE INDEX "waitlist_email_idx" ON "waitlist_entries" USING btree ("email");