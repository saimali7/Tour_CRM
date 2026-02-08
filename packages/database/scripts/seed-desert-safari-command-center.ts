/**
 * Deterministic command-center seed for Demo Tours.
 *
 * Creates exactly 10 Desert Safari bookings on one date:
 * - 7 shared ("join")
 * - 3 private ("charter")
 *
 * Existing bookings on the target date are removed first so the canvas only
 * shows this focused dataset.
 *
 * Usage:
 *   pnpm --filter @tour/database exec tsx scripts/seed-desert-safari-command-center.ts
 *   pnpm --filter @tour/database exec tsx scripts/seed-desert-safari-command-center.ts --org-slug=demo-tours --date=2026-02-08
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

const TOUR_SLUG = "desert-safari-command-center";

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

function parseTargetDate(value: string | null): Date {
  if (!value) {
    const now = new Date();
    // Use UTC noon to avoid timezone-shift issues with PostgreSQL date columns
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date value "${value}". Use YYYY-MM-DD.`);
  }
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  // Use UTC noon so the date doesn't shift when PostgreSQL converts to UTC
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

async function ensureTour(orgId: string, currency: string) {
  const existing = await db.query.tours.findFirst({
    where: and(eq(schema.tours.organizationId, orgId), eq(schema.tours.slug, TOUR_SLUG)),
  });
  if (existing) return existing;

  const [product] = await db
    .insert(schema.products)
    .values({
      id: createId(),
      organizationId: orgId,
      type: "tour",
      name: "Desert Safari",
      slug: TOUR_SLUG,
      description: "Focused test tour for command center assignment validation.",
      shortDescription: "Command center test tour",
      status: "active",
      visibility: "public",
      basePrice: "95.00",
      currency,
      tags: ["desert-safari", "command-center", "test"],
    })
    .returning();

  if (!product) throw new Error("Failed to create product for Desert Safari tour");

  const [tour] = await db
    .insert(schema.tours)
    .values({
      id: createId(),
      productId: product.id,
      organizationId: orgId,
      name: "Desert Safari",
      slug: TOUR_SLUG,
      description: "Focused test tour for command center assignment validation.",
      shortDescription: "Command center test tour",
      durationMinutes: 240,
      minParticipants: 1,
      maxParticipants: 30,
      guestsPerGuide: 6,
      basePrice: "95.00",
      currency,
      meetingPoint: "Desert Camp Base",
      meetingPointDetails: "Main gate",
      status: "active",
      isPublic: false,
      tags: ["desert-safari", "command-center", "test"],
      includes: ["Guide", "Transport"],
      excludes: ["Meals"],
      requirements: ["Comfortable clothes"],
    })
    .returning();

  if (!tour) throw new Error("Failed to create Desert Safari tour");
  return tour;
}

async function ensurePickupZones(orgId: string) {
  const zones = await db
    .select({
      id: schema.pickupZones.id,
      name: schema.pickupZones.name,
      color: schema.pickupZones.color,
    })
    .from(schema.pickupZones)
    .where(eq(schema.pickupZones.organizationId, orgId));

  if (zones.length > 0) return zones;

  const created = await db
    .insert(schema.pickupZones)
    .values([
      { organizationId: orgId, name: "Marina", color: "#3B82F6", sortOrder: 0 },
      { organizationId: orgId, name: "Downtown", color: "#10B981", sortOrder: 1 },
      { organizationId: orgId, name: "Palm Jumeirah", color: "#F59E0B", sortOrder: 2 },
    ])
    .returning({
      id: schema.pickupZones.id,
      name: schema.pickupZones.name,
      color: schema.pickupZones.color,
    });

  return created;
}

async function ensureCustomers(orgId: string) {
  const seeds = [
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
  ];

  const customers: Array<typeof schema.customers.$inferSelect> = [];
  for (const seed of seeds) {
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

async function clearDateBookings(orgId: string, targetDate: Date) {
  const dateStr = formatDateLocal(targetDate);
  const bookingRows = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.organizationId, orgId), sql`${schema.bookings.bookingDate}::text = ${dateStr}`));

  if (bookingRows.length === 0) return 0;
  const bookingIds = bookingRows.map((row) => row.id);

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.refunds)
      .where(and(eq(schema.refunds.organizationId, orgId), inArray(schema.refunds.bookingId, bookingIds)));
    await tx
      .delete(schema.payments)
      .where(and(eq(schema.payments.organizationId, orgId), inArray(schema.payments.bookingId, bookingIds)));
    await tx
      .delete(schema.bookings)
      .where(and(eq(schema.bookings.organizationId, orgId), inArray(schema.bookings.id, bookingIds)));
  });

  return bookingIds.length;
}

async function main() {
  const orgSlug = getArg("org-slug") ?? "demo-tours";
  const targetDate = parseTargetDate(getArg("date"));
  const dateKey = formatDateLocal(targetDate);
  const referencePrefix = `DS-${dateKey.replace(/-/g, "")}`;

  console.log(`🌱 Seeding deterministic Desert Safari dataset for ${orgSlug} on ${dateKey}...`);

  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.slug, orgSlug),
  });
  if (!org) {
    throw new Error(`Organization not found: ${orgSlug}`);
  }

  const deletedCount = await clearDateBookings(org.id, targetDate);
  console.log(`🧹 Cleared ${deletedCount} existing bookings on ${dateKey}`);

  const currency = org.country === "US" ? "USD" : "AED";
  const tour = await ensureTour(org.id, currency);
  const zones = await ensurePickupZones(org.id);
  const customers = await ensureCustomers(org.id);

  const byZoneName = new Map(zones.map((zone) => [zone.name.toLowerCase(), zone]));
  const marina = byZoneName.get("marina") ?? zones[0];
  const downtown = byZoneName.get("downtown") ?? zones[1] ?? zones[0];
  const palm = byZoneName.get("palm jumeirah") ?? zones[2] ?? zones[0];
  if (!marina || !downtown || !palm) {
    throw new Error("Pickup zones are unavailable");
  }

  const templates = [
    { time: "09:00", mode: "join" as const, adults: 2, children: 2, customerIndex: 0, zone: marina, ref: "001", name: "Marina Hotel Lobby" },
    { time: "09:00", mode: "join" as const, adults: 4, children: 0, customerIndex: 1, zone: downtown, ref: "002", name: "Downtown Tower Entrance" },
    { time: "09:00", mode: "charter" as const, adults: 2, children: 0, customerIndex: 2, zone: palm, ref: "003", name: "Palm Residence Gate A" },
    { time: "14:00", mode: "join" as const, adults: 3, children: 1, customerIndex: 3, zone: marina, ref: "004", name: "Marina Mall Pickup Bay" },
    { time: "14:00", mode: "join" as const, adults: 2, children: 1, customerIndex: 4, zone: downtown, ref: "005", name: "Business Bay Promenade" },
    { time: "16:00", mode: "join" as const, adults: 4, children: 0, customerIndex: 5, zone: palm, ref: "006", name: "Palm Beach Club" },
    { time: "18:00", mode: "charter" as const, adults: 2, children: 1, customerIndex: 6, zone: marina, ref: "007", name: "Marina Private Villa" },
    { time: "14:00", mode: "charter" as const, adults: 6, children: 2, customerIndex: 7, zone: palm, ref: "008", name: "Palm Royal Penthouse" },
    { time: "09:00", mode: "join" as const, adults: 2, children: 0, customerIndex: 8, zone: palm, ref: "009", name: "Palm Gateway Plaza" },
    { time: "09:00", mode: "join" as const, adults: 2, children: 0, customerIndex: 9, zone: marina, ref: "010", name: "Marina Walk Entrance" },
  ];

  let sharedCount = 0;
  let privateCount = 0;

  for (const template of templates) {
    const customer = customers[template.customerIndex];
    if (!customer) throw new Error(`Missing customer at index ${template.customerIndex}`);

    const totalParticipants = template.adults + template.children;
    const subtotalValue = template.mode === "charter"
      ? 420
      : totalParticipants * 95;

    await db.insert(schema.bookings).values({
      organizationId: org.id,
      referenceNumber: `${referencePrefix}-${template.ref}`,
      customerId: customer.id,
      tourId: tour.id,
      bookingDate: targetDate,
      bookingTime: template.time,
      guestAdults: template.adults,
      guestChildren: template.children,
      guestInfants: 0,
      adultCount: template.adults,
      childCount: template.children,
      infantCount: 0,
      totalParticipants,
      subtotal: subtotalValue.toFixed(2),
      discount: "0",
      tax: "0",
      total: subtotalValue.toFixed(2),
      currency,
      status: "confirmed",
      paymentStatus: "paid",
      source: "manual",
      sourceDetails: "command-center-desert-safari-seed",
      pricingSnapshot: {
        optionName: template.mode === "charter" ? "Private Desert Safari" : "Shared Desert Safari",
        experienceMode: template.mode,
      },
      pickupZoneId: template.zone.id,
      pickupLocation: template.name,
      pickupTime: template.time,
      isFirstTime: template.mode === "join",
    });

    if (template.mode === "charter") {
      privateCount += 1;
    } else {
      sharedCount += 1;
    }
  }

  console.log(`✅ Created ${sharedCount + privateCount} bookings on ${dateKey}`);
  console.log(`   Shared: ${sharedCount}`);
  console.log(`   Private: ${privateCount}`);
  console.log(`   Tour: ${tour.name} (${tour.slug})`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
