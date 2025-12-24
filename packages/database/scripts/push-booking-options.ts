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

  // 3. Create schedule_option_availability table
  console.log("Creating schedule_option_availability table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS schedule_option_availability (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
      booking_option_id TEXT NOT NULL REFERENCES booking_options(id) ON DELETE CASCADE,
      total_seats INTEGER,
      booked_seats INTEGER NOT NULL DEFAULT 0,
      total_units INTEGER,
      booked_units INTEGER NOT NULL DEFAULT 0,
      is_available BOOLEAN NOT NULL DEFAULT true,
      override_pricing JSONB,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(schedule_id, booking_option_id)
    )
  `);
  console.log("✓ schedule_option_availability table created");

  // 4. Create indexes for schedule_option_availability
  console.log("Creating indexes for schedule_option_availability...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS schedule_option_avail_schedule_idx ON schedule_option_availability(schedule_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS schedule_option_avail_option_idx ON schedule_option_availability(booking_option_id)
  `);
  console.log("✓ schedule_option_availability indexes created");

  // 5. Create waitlist_entries table
  console.log("Creating waitlist_entries table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS waitlist_entries (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
      booking_option_id TEXT REFERENCES booking_options(id) ON DELETE SET NULL,
      customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
      guest_email TEXT,
      guest_name TEXT,
      guest_phone TEXT,
      party_size INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'waiting',
      notified_at TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ waitlist_entries table created");

  // 6. Create indexes for waitlist_entries
  console.log("Creating indexes for waitlist_entries...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS waitlist_schedule_idx ON waitlist_entries(schedule_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS waitlist_customer_idx ON waitlist_entries(customer_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS waitlist_status_idx ON waitlist_entries(status)
  `);
  console.log("✓ waitlist_entries indexes created");

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

async function initializeScheduleAvailability() {
  console.log("📅 Initializing schedule availability for existing schedules...\n");

  // Get all schedules that don't have availability entries
  const schedulesWithoutAvailability = await db.execute(sql`
    SELECT s.id, s.organization_id, s.tour_id, s.max_participants
    FROM schedules s
    WHERE NOT EXISTS (
      SELECT 1 FROM schedule_option_availability soa WHERE soa.schedule_id = s.id
    )
  `);

  // Handle different result formats
  const scheduleRows = Array.isArray(schedulesWithoutAvailability)
    ? schedulesWithoutAvailability
    : (schedulesWithoutAvailability as any).rows || [];

  const schedules = scheduleRows as Array<{
    id: string;
    organization_id: string;
    tour_id: string;
    max_participants: number | null;
  }>;

  console.log(`Found ${schedules.length} schedules without availability tracking`);

  let created = 0;
  for (const schedule of schedules) {
    // Get active booking options for this tour
    const optionsResult = await db.execute(sql`
      SELECT id, capacity_model
      FROM booking_options
      WHERE tour_id = ${schedule.tour_id}
        AND status = 'active'
    `);

    const optionRows = Array.isArray(optionsResult)
      ? optionsResult
      : (optionsResult as any).rows || [];

    const options = optionRows as Array<{
      id: string;
      capacity_model: { type: string; totalSeats?: number; totalUnits?: number };
    }>;

    for (const option of options) {
      const availId = `avail_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const capacityModel = option.capacity_model;

      await db.execute(sql`
        INSERT INTO schedule_option_availability (
          id, organization_id, schedule_id, booking_option_id,
          total_seats, booked_seats, total_units, booked_units, is_available
        ) VALUES (
          ${availId},
          ${schedule.organization_id},
          ${schedule.id},
          ${option.id},
          ${capacityModel.type === "shared" ? capacityModel.totalSeats || schedule.max_participants || 30 : null},
          0,
          ${capacityModel.type === "unit" ? capacityModel.totalUnits || 1 : null},
          0,
          true
        )
        ON CONFLICT (schedule_id, booking_option_id) DO NOTHING
      `);
      created++;
    }
  }

  console.log(`✅ Created ${created} schedule availability entries\n`);
}

async function main() {
  try {
    await pushTables();
    await createDefaultOptionsForExistingTours();
    await initializeScheduleAvailability();

    console.log("🎉 Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
