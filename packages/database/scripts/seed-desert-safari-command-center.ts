/**
 * Deterministic command-center seed for Demo Tours.
 *
 * Creates 6-8 bookings per day across 3 days (Feb 9-11) for two tours:
 * - Desert Safari (4h, shared + private)
 * - Abu Dhabi City Tour (6h, shared + private)
 *
 * Existing bookings on each target date are removed first.
 *
 * Usage:
 *   pnpm --filter @tour/database exec tsx scripts/seed-desert-safari-command-center.ts
 *   pnpm --filter @tour/database exec tsx scripts/seed-desert-safari-command-center.ts --org-slug=demo-tours
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/schema";
import { createId } from "../src/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "../../../.env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getArg(name: string): string | null {
  const match = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!match) return null;
  const value = match.slice(name.length + 3).trim();
  return value.length > 0 ? value : null;
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function makeDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

// ---------------------------------------------------------------------------
// Tour setup
// ---------------------------------------------------------------------------

interface TourDef {
  slug: string;
  name: string;
  duration: number;
  basePrice: string;
  meetingPoint: string;
}

const TOUR_DEFS: TourDef[] = [
  {
    slug: "desert-safari-command-center",
    name: "Desert Safari",
    duration: 240,
    basePrice: "95.00",
    meetingPoint: "Desert Camp Base",
  },
  {
    slug: "abu-dhabi-city-tour-command-center",
    name: "Abu Dhabi City Tour",
    duration: 360,
    basePrice: "149.00",
    meetingPoint: "Sheikh Zayed Grand Mosque Entrance",
  },
];

async function ensureTour(orgId: string, currency: string, def: TourDef) {
  const existing = await db.query.tours.findFirst({
    where: and(eq(schema.tours.organizationId, orgId), eq(schema.tours.slug, def.slug)),
  });
  if (existing) return existing;

  const [product] = await db
    .insert(schema.products)
    .values({
      id: createId(),
      organizationId: orgId,
      type: "tour",
      name: def.name,
      slug: def.slug,
      description: `Command center test tour: ${def.name}`,
      shortDescription: `Test ${def.name}`,
      status: "active",
      visibility: "public",
      basePrice: def.basePrice,
      currency,
      tags: ["command-center", "test"],
    })
    .returning();

  if (!product) throw new Error(`Failed to create product for ${def.name}`);

  const [tour] = await db
    .insert(schema.tours)
    .values({
      id: createId(),
      productId: product.id,
      organizationId: orgId,
      name: def.name,
      slug: def.slug,
      description: `Command center test tour: ${def.name}`,
      shortDescription: `Test ${def.name}`,
      durationMinutes: def.duration,
      minParticipants: 1,
      maxParticipants: 30,
      guestsPerGuide: 6,
      basePrice: def.basePrice,
      currency,
      meetingPoint: def.meetingPoint,
      meetingPointDetails: "Main entrance",
      status: "active",
      isPublic: false,
      tags: ["command-center", "test"],
      includes: ["Guide", "Transport"],
      excludes: ["Meals"],
      requirements: ["Comfortable clothes"],
    })
    .returning();

  if (!tour) throw new Error(`Failed to create ${def.name} tour`);
  return tour;
}

// ---------------------------------------------------------------------------
// Pickup zones
// ---------------------------------------------------------------------------

async function ensurePickupZones(orgId: string) {
  const zones = await db
    .select({ id: schema.pickupZones.id, name: schema.pickupZones.name, color: schema.pickupZones.color })
    .from(schema.pickupZones)
    .where(eq(schema.pickupZones.organizationId, orgId));

  if (zones.length > 0) return zones;

  return db
    .insert(schema.pickupZones)
    .values([
      { organizationId: orgId, name: "Marina", color: "#3B82F6", sortOrder: 0 },
      { organizationId: orgId, name: "Downtown", color: "#10B981", sortOrder: 1 },
      { organizationId: orgId, name: "Palm Jumeirah", color: "#F59E0B", sortOrder: 2 },
    ])
    .returning({ id: schema.pickupZones.id, name: schema.pickupZones.name, color: schema.pickupZones.color });
}

// ---------------------------------------------------------------------------
// Customers (enough for 3 days x 8 bookings, reused across days)
// ---------------------------------------------------------------------------

const CUSTOMER_SEEDS = [
  { firstName: "Sarah", lastName: "Johnson", email: "dispatch.ds.01@example.com", phone: "+1-555-700-0101" },
  { firstName: "David", lastName: "Williams", email: "dispatch.ds.02@example.com", phone: "+1-555-700-0102" },
  { firstName: "Emma", lastName: "Thompson", email: "dispatch.ds.03@example.com", phone: "+1-555-700-0103" },
  { firstName: "James", lastName: "Smith", email: "dispatch.ds.04@example.com", phone: "+1-555-700-0104" },
  { firstName: "Carlos", lastName: "Garcia", email: "dispatch.ds.05@example.com", phone: "+1-555-700-0105" },
  { firstName: "Wei", lastName: "Chen", email: "dispatch.ds.06@example.com", phone: "+1-555-700-0106" },
  { firstName: "Klaus", lastName: "Muller", email: "dispatch.ds.07@example.com", phone: "+1-555-700-0107" },
  { firstName: "Aisha", lastName: "Al-Rashid", email: "dispatch.ds.08@example.com", phone: "+1-555-700-0108" },
  { firstName: "Liam", lastName: "O'Connor", email: "dispatch.ds.09@example.com", phone: "+1-555-700-0109" },
  { firstName: "Priya", lastName: "Sharma", email: "dispatch.ds.10@example.com", phone: "+1-555-700-0110" },
  { firstName: "Fatima", lastName: "Hassan", email: "dispatch.ds.11@example.com", phone: "+1-555-700-0111" },
  { firstName: "Marco", lastName: "Rossi", email: "dispatch.ds.12@example.com", phone: "+1-555-700-0112" },
];

async function ensureCustomers(orgId: string) {
  const customers: Array<typeof schema.customers.$inferSelect> = [];
  for (const seed of CUSTOMER_SEEDS) {
    const existing = await db.query.customers.findFirst({
      where: and(eq(schema.customers.organizationId, orgId), eq(schema.customers.email, seed.email)),
    });
    if (existing) {
      customers.push(existing);
      continue;
    }
    const [created] = await db
      .insert(schema.customers)
      .values({
        organizationId: orgId,
        firstName: seed.firstName,
        lastName: seed.lastName,
        email: seed.email,
        phone: seed.phone,
      })
      .returning();
    if (!created) throw new Error(`Failed to create customer ${seed.email}`);
    customers.push(created);
  }
  return customers;
}

// ---------------------------------------------------------------------------
// Clear existing bookings for a date
// ---------------------------------------------------------------------------

async function clearDateBookings(orgId: string, targetDate: Date) {
  const dateStr = formatDateLocal(targetDate);
  const bookingRows = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.organizationId, orgId), sql`${schema.bookings.bookingDate}::text = ${dateStr}`));

  if (bookingRows.length === 0) return 0;
  const bookingIds = bookingRows.map((row) => row.id);

  await db.transaction(async (tx) => {
    await tx.delete(schema.refunds).where(and(eq(schema.refunds.organizationId, orgId), inArray(schema.refunds.bookingId, bookingIds)));
    await tx.delete(schema.payments).where(and(eq(schema.payments.organizationId, orgId), inArray(schema.payments.bookingId, bookingIds)));
    await tx.delete(schema.bookings).where(and(eq(schema.bookings.organizationId, orgId), inArray(schema.bookings.id, bookingIds)));
  });

  return bookingIds.length;
}

// ---------------------------------------------------------------------------
// Booking templates per day (tourIndex 0 = Desert Safari, 1 = Abu Dhabi)
// ---------------------------------------------------------------------------

type Mode = "join" | "charter";

interface BookingTemplate {
  tourIndex: number;
  time: string;
  mode: Mode;
  adults: number;
  children: number;
  customerIndex: number;
  zoneKey: "marina" | "downtown" | "palm";
  pickup: string;
}

// Feb 9 — 8 bookings: 5 shared, 3 private, both tours
const DAY_1: BookingTemplate[] = [
  { tourIndex: 0, time: "09:00", mode: "join",    adults: 2, children: 2, customerIndex: 0, zoneKey: "marina",   pickup: "Marina Hotel Lobby" },
  { tourIndex: 0, time: "09:00", mode: "join",    adults: 4, children: 0, customerIndex: 1, zoneKey: "downtown", pickup: "Downtown Tower Entrance" },
  { tourIndex: 0, time: "09:00", mode: "charter", adults: 2, children: 0, customerIndex: 2, zoneKey: "palm",     pickup: "Palm Residence Gate A" },
  { tourIndex: 1, time: "08:00", mode: "join",    adults: 3, children: 1, customerIndex: 3, zoneKey: "marina",   pickup: "Marina Mall Pickup Bay" },
  { tourIndex: 1, time: "08:00", mode: "join",    adults: 2, children: 0, customerIndex: 4, zoneKey: "downtown", pickup: "Business Bay Promenade" },
  { tourIndex: 0, time: "14:00", mode: "join",    adults: 2, children: 1, customerIndex: 5, zoneKey: "palm",     pickup: "Palm Beach Club" },
  { tourIndex: 0, time: "14:00", mode: "charter", adults: 6, children: 2, customerIndex: 6, zoneKey: "palm",     pickup: "Palm Royal Penthouse" },
  { tourIndex: 1, time: "08:00", mode: "charter", adults: 4, children: 0, customerIndex: 7, zoneKey: "marina",   pickup: "Marina Private Villa" },
];

// Feb 10 — 7 bookings: 5 shared, 2 private, heavier Abu Dhabi day
const DAY_2: BookingTemplate[] = [
  { tourIndex: 1, time: "07:30", mode: "join",    adults: 2, children: 0, customerIndex: 8,  zoneKey: "downtown", pickup: "Downtown Hilton Lobby" },
  { tourIndex: 1, time: "07:30", mode: "join",    adults: 3, children: 2, customerIndex: 9,  zoneKey: "marina",   pickup: "Marina Yacht Club" },
  { tourIndex: 1, time: "07:30", mode: "charter", adults: 5, children: 1, customerIndex: 10, zoneKey: "palm",     pickup: "Palm Grand Villa" },
  { tourIndex: 0, time: "09:00", mode: "join",    adults: 4, children: 0, customerIndex: 0,  zoneKey: "downtown", pickup: "Downtown Trade Centre" },
  { tourIndex: 0, time: "09:00", mode: "join",    adults: 2, children: 1, customerIndex: 1,  zoneKey: "marina",   pickup: "Marina Promenade" },
  { tourIndex: 0, time: "16:00", mode: "join",    adults: 3, children: 0, customerIndex: 2,  zoneKey: "palm",     pickup: "Palm Atlantis Gate" },
  { tourIndex: 0, time: "16:00", mode: "charter", adults: 2, children: 0, customerIndex: 3,  zoneKey: "downtown", pickup: "DIFC Entrance" },
];

// Feb 11 — 6 bookings: 4 shared, 2 private, balanced
const DAY_3: BookingTemplate[] = [
  { tourIndex: 0, time: "09:00", mode: "join",    adults: 2, children: 0, customerIndex: 4,  zoneKey: "marina",   pickup: "Marina Walk Entrance" },
  { tourIndex: 0, time: "09:00", mode: "join",    adults: 3, children: 1, customerIndex: 5,  zoneKey: "downtown", pickup: "Downtown Souk" },
  { tourIndex: 1, time: "08:00", mode: "join",    adults: 2, children: 0, customerIndex: 11, zoneKey: "palm",     pickup: "Palm Nakheel Mall" },
  { tourIndex: 1, time: "08:00", mode: "join",    adults: 4, children: 2, customerIndex: 6,  zoneKey: "marina",   pickup: "Marina JBR Beach" },
  { tourIndex: 0, time: "17:00", mode: "charter", adults: 2, children: 1, customerIndex: 7,  zoneKey: "palm",     pickup: "Palm Fairmont Gate" },
  { tourIndex: 1, time: "08:00", mode: "charter", adults: 3, children: 0, customerIndex: 8,  zoneKey: "downtown", pickup: "Downtown Burj Khalifa Base" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const orgSlug = getArg("org-slug") ?? "demo-tours";

  console.log(`\n🌱 Seeding 3-day command center dataset for ${orgSlug} (Feb 9-11)...\n`);

  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.slug, orgSlug),
  });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);

  const currency = org.country === "US" ? "USD" : "AED";

  // Ensure both tours
  const tours = await Promise.all(TOUR_DEFS.map((def) => ensureTour(org.id, currency, def)));
  const zones = await ensurePickupZones(org.id);
  const customers = await ensureCustomers(org.id);

  const zoneLookup = new Map(zones.map((z) => [z.name.toLowerCase(), z]));
  const zoneByKey = {
    marina: zoneLookup.get("marina") ?? zones[0],
    downtown: zoneLookup.get("downtown") ?? zones[1] ?? zones[0],
    palm: zoneLookup.get("palm jumeirah") ?? zones[2] ?? zones[0],
  };
  if (!zoneByKey.marina || !zoneByKey.downtown || !zoneByKey.palm) {
    throw new Error("Pickup zones are unavailable");
  }

  const days: Array<{ date: Date; templates: BookingTemplate[] }> = [
    { date: makeDate(2026, 2, 9),  templates: DAY_1 },
    { date: makeDate(2026, 2, 10), templates: DAY_2 },
    { date: makeDate(2026, 2, 11), templates: DAY_3 },
  ];

  let grandTotal = 0;

  for (const day of days) {
    const dateKey = formatDateLocal(day.date);
    const prefix = `CC-${dateKey.replace(/-/g, "")}`;

    const cleared = await clearDateBookings(org.id, day.date);
    if (cleared > 0) console.log(`  🧹 Cleared ${cleared} existing bookings on ${dateKey}`);

    let shared = 0;
    let priv = 0;

    for (let i = 0; i < day.templates.length; i++) {
      const t = day.templates[i]!;
      const tour = tours[t.tourIndex];
      const customer = customers[t.customerIndex];
      const zone = zoneByKey[t.zoneKey];
      if (!tour || !customer || !zone) throw new Error(`Missing data for template ${i} on ${dateKey}`);

      const total = t.adults + t.children;
      const price = t.mode === "charter" ? 420 : total * Number(tour.basePrice);

      await db.insert(schema.bookings).values({
        organizationId: org.id,
        referenceNumber: `${prefix}-${String(i + 1).padStart(3, "0")}`,
        customerId: customer.id,
        tourId: tour.id,
        bookingDate: day.date,
        bookingTime: t.time,
        guestAdults: t.adults,
        guestChildren: t.children,
        guestInfants: 0,
        adultCount: t.adults,
        childCount: t.children,
        infantCount: 0,
        totalParticipants: total,
        subtotal: price.toFixed(2),
        discount: "0",
        tax: "0",
        total: price.toFixed(2),
        currency,
        status: "confirmed",
        paymentStatus: "paid",
        source: "manual",
        sourceDetails: "command-center-seed",
        pricingSnapshot: {
          optionName: t.mode === "charter" ? `Private ${tour.name}` : `Shared ${tour.name}`,
          experienceMode: t.mode,
        },
        pickupZoneId: zone.id,
        pickupLocation: t.pickup,
        pickupTime: t.time,
        isFirstTime: t.mode === "join",
      });

      if (t.mode === "charter") priv++; else shared++;
    }

    grandTotal += day.templates.length;
    console.log(`  ✅ ${dateKey}: ${day.templates.length} bookings (${shared} shared, ${priv} private)`);
  }

  console.log(`\n🎯 Total: ${grandTotal} bookings across 3 days`);
  console.log(`   Tours: ${tours.map((t) => t.name).join(", ")}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
