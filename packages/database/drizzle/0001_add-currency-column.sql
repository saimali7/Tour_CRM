-- Add currency column to organizations table
-- Safe: Uses IF NOT EXISTS pattern for production environments
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'AED' NOT NULL;
