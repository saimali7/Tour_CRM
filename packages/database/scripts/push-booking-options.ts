/**
 * Push booking options tables and create default options for existing tours
 * Run with: npx tsx scripts/push-booking-options.ts
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "../src";

config({ path: "../../.env.local" });

async function pushTables() {
  console.log("🔧 Pushing booking options tables...\n");

  // 1. Create booking_options table
  console.log("Creating booking_options table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS booking_options (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      short_description TEXT,
      full_description TEXT,
      badge TEXT,
      highlight_text TEXT,
      pricing_model JSONB NOT NULL,
      capacity_model JSONB NOT NULL,
      scheduling_type TEXT NOT NULL DEFAULT 'fixed',
      is_default BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ booking_options table created");

  // 2. Create indexes for booking_options
  console.log("Creating indexes for booking_options...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS booking_options_org_idx ON booking_options(organization_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS booking_options_tour_idx ON booking_options(tour_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS booking_options_tour_status_idx ON booking_options(tour_id, status)
  `);
  console.log("✓ booking_options indexes created");

  console.log("\n✅ All tables created successfully!\n");
}

async function createDefaultOptionsForExistingTours() {
  console.log("📦 Creating default booking options for existing tours...\n");

  // Get all tours that don't have any booking options
  const toursWithoutOptions = await db.execute(sql`
    SELECT t.id, t.organization_id, t.name, t.base_price, t.max_participants
    FROM tours t
    WHERE NOT EXISTS (
      SELECT 1 FROM booking_options bo WHERE bo.tour_id = t.id
    )
  `);

  // Handle different result formats
  const rows = Array.isArray(toursWithoutOptions)
    ? toursWithoutOptions
    : (toursWithoutOptions as any).rows || [];

  const tours = rows as Array<{
    id: string;
    organization_id: string;
    name: string;
    base_price: string;
    max_participants: number | null;
  }>;

  console.log(`Found ${tours.length} tours without booking options`);

  for (const tour of tours) {
    const optionId = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const basePrice = parseFloat(tour.base_price || "0");
    const priceInCents = Math.round(basePrice * 100);
    const maxParticipants = tour.max_participants || 30;

    // Create pricing model (per_person with adult tier)
    const pricingModel = {
      type: "per_person",
      tiers: [
        {
          tierType: "adult",
          label: "Adult",
          ageRange: { min: 13 },
          price: { amount: priceInCents, currency: "USD" },
        },
        {
          tierType: "child",
          label: "Child",
          ageRange: { min: 3, max: 12 },
          price: { amount: Math.round(priceInCents * 0.5), currency: "USD" },
        },
        {
          tierType: "infant",
          label: "Infant",
          ageRange: { max: 2 },
          price: { amount: 0, currency: "USD" },
          isFree: true,
        },
      ],
    };

    // Create capacity model (shared seats)
    const capacityModel = {
      type: "shared",
      totalSeats: maxParticipants,
    };

    await db.execute(sql`
      INSERT INTO booking_options (
        id, organization_id, tour_id, name, short_description,
        pricing_model, capacity_model, scheduling_type,
        is_default, sort_order, status
      ) VALUES (
        ${optionId},
        ${tour.organization_id},
        ${tour.id},
        'Standard Experience',
        'Join our regular group tour',
        ${JSON.stringify(pricingModel)}::jsonb,
        ${JSON.stringify(capacityModel)}::jsonb,
        'fixed',
        true,
        0,
        'active'
      )
    `);

    console.log(`✓ Created default option for: ${tour.name}`);
  }

  console.log(`\n✅ Created ${tours.length} default booking options\n`);
}

async function main() {
  try {
    await pushTables();
    await createDefaultOptionsForExistingTours();

    console.log("🎉 Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
