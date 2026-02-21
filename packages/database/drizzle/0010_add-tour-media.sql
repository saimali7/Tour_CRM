ALTER TABLE "tours"
ADD COLUMN IF NOT EXISTS "media" jsonb DEFAULT '[]'::jsonb;
