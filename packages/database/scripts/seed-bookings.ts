/**
 * Seed script to create test bookings for yesterday, today, and tomorrow
 * Uses the new availability-based booking model (no schedules table)
 *
 * Run with: npx tsx packages/database/scripts/seed-bookings.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

// Helper to generate reference number
function generateRefNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "BK-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to get random item from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

// Test customer data
const testCustomers = [
  { firstName: "John", lastName: "Smith", email: "john.smith@example.com", phone: "+971-50-555-0101" },
  { firstName: "Sarah", lastName: "Johnson", email: "sarah.j@example.com", phone: "+971-50-555-0102" },
  { firstName: "Michael", lastName: "Brown", email: "m.brown@example.com", phone: "+971-50-555-0103" },
  { firstName: "Emily", lastName: "Davis", email: "emily.d@example.com", phone: "+971-50-555-0104" },
  { firstName: "David", lastName: "Wilson", email: "dwilson@example.com", phone: "+971-50-555-0105" },
  { firstName: "Lisa", lastName: "Taylor", email: "lisa.t@example.com", phone: "+971-50-555-0106" },
  { firstName: "James", lastName: "Anderson", email: "j.anderson@example.com", phone: "+971-50-555-0107" },
  { firstName: "Jennifer", lastName: "Martinez", email: "jen.m@example.com", phone: "+971-50-555-0108" },
  { firstName: "Robert", lastName: "Garcia", email: "r.garcia@example.com", phone: "+971-50-555-0109" },
  { firstName: "Maria", lastName: "Rodriguez", email: "m.rodriguez@example.com", phone: "+971-50-555-0110" },
];

// Pickup locations for testing dispatch
const pickupLocations = [
  { name: "Hilton Dubai Marina", address: "Dubai Marina, Dubai, UAE" },
  { name: "JW Marriott Marquis", address: "Business Bay, Dubai, UAE" },
  { name: "Atlantis The Palm", address: "Palm Jumeirah, Dubai, UAE" },
  { name: "Burj Al Arab", address: "Jumeirah Beach Road, Dubai, UAE" },
  { name: "Address Downtown", address: "Downtown Dubai, Dubai, UAE" },
  { name: "Ritz-Carlton DIFC", address: "DIFC, Dubai, UAE" },
  { name: "Four Seasons Jumeirah", address: "Jumeirah Beach Road, Dubai, UAE" },
  { name: "Waldorf Astoria", address: "Palm Jumeirah, Dubai, UAE" },
];

const specialRequests = [
  null,
  "Vegetarian meals please",
  "Celebrating anniversary",
  "Need wheelchair accessible options",
  "Traveling with elderly parent",
  null,
  "Allergic to shellfish",
  null,
  "Birthday celebration - surprise!",
  "First time in Dubai",
];

// Time slots for tours
const timeSlots = ["09:00", "11:00", "14:00", "16:00"];

async function main() {
  console.log("🌱 Seeding test bookings for guide assignment testing...\n");

  // 1. Find an organization
  const orgs = await db.select().from(schema.organizations).limit(1);
  if (orgs.length === 0) {
    console.error("❌ No organizations found. Please create an organization first.");
    process.exit(1);
  }
  const org = orgs[0]!;
  console.log(`📍 Using organization: ${org.name} (${org.id})`);

  // 2. Find existing tours
  let tours = await db
    .select()
    .from(schema.tours)
    .where(and(eq(schema.tours.organizationId, org.id), eq(schema.tours.status, "active")))
    .limit(5);

  if (tours.length === 0) {
    console.log("⚠️  No active tours found. Looking for any tours...");
    tours = await db
      .select()
      .from(schema.tours)
      .where(eq(schema.tours.organizationId, org.id))
      .limit(5);

    if (tours.length === 0) {
      console.error("❌ No tours found. Please create tours first via the CRM.");
      process.exit(1);
    }
  }
  console.log(`✅ Found ${tours.length} tours`);

  // 3. Find existing guides
  const guides = await db
    .select()
    .from(schema.guides)
    .where(and(eq(schema.guides.organizationId, org.id), eq(schema.guides.status, "active")));

  if (guides.length === 0) {
    console.log("⚠️  No active guides found. Bookings will be created without guide assignments.");
  } else {
    console.log(`✅ Found ${guides.length} active guides`);
  }

  // 4. Find or create pickup zones
  let pickupZones = await db
    .select()
    .from(schema.pickupZones)
    .where(eq(schema.pickupZones.organizationId, org.id));

  if (pickupZones.length === 0) {
    console.log("📝 Creating pickup zones...");
    const zoneData = [
      { name: "Marina", color: "#3B82F6" },
      { name: "Downtown", color: "#10B981" },
      { name: "Palm Jumeirah", color: "#F59E0B" },
      { name: "JBR", color: "#EF4444" },
      { name: "Business Bay", color: "#8B5CF6" },
    ];

    for (const z of zoneData) {
      const [zone] = await db
        .insert(schema.pickupZones)
        .values({
          organizationId: org.id,
          name: z.name,
          color: z.color,
          sortOrder: zoneData.indexOf(z),
        })
        .returning();
      pickupZones.push(zone!);
    }
    console.log(`✅ Created ${pickupZones.length} pickup zones`);
  } else {
    console.log(`✅ Found ${pickupZones.length} existing pickup zones`);
  }

  // 5. Create/find customers
  const customers: (typeof schema.customers.$inferSelect)[] = [];

  for (const c of testCustomers) {
    const existing = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.organizationId, org.id), eq(schema.customers.email, c.email)))
      .limit(1);

    if (existing.length === 0) {
      const [customer] = await db
        .insert(schema.customers)
        .values({
          organizationId: org.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
        })
        .returning();
      customers.push(customer!);
    } else {
      customers.push(existing[0]!);
    }
  }
  console.log(`✅ Created/found ${customers.length} customers`);

  // 6. Calculate dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log(`\n📅 Creating bookings for:`);
  console.log(`   Yesterday: ${formatDate(yesterday)}`);
  console.log(`   Today:     ${formatDate(today)}`);
  console.log(`   Tomorrow:  ${formatDate(tomorrow)}`);

  // 7. Create bookings
  let bookingsCreated = 0;

  // Helper to create a booking
  async function createBooking(
    date: Date,
    time: string,
    tour: (typeof tours)[0],
    assignGuide: boolean
  ) {
    const customer = randomItem(customers);
    const participants = 1 + Math.floor(Math.random() * 5); // 1-5 participants
    const basePrice = parseFloat(tour.basePrice || "150");
    const total = (basePrice * participants).toFixed(2);

    // Randomize status and payment
    const statusRoll = Math.random();
    const status = statusRoll > 0.15 ? "confirmed" : "pending"; // 85% confirmed
    const paymentRoll = Math.random();
    const paymentStatus = paymentRoll > 0.3 ? "paid" : paymentRoll > 0.1 ? "partial" : "pending";
    const paidAmount =
      paymentStatus === "paid"
        ? total
        : paymentStatus === "partial"
          ? (parseFloat(total) * 0.5).toFixed(2)
          : "0";

    // Pickup info
    const pickupZone = randomItem(pickupZones);
    const pickup = randomItem(pickupLocations);

    // Calculate pickup time (30-60 mins before tour time)
    const [hours, mins] = time.split(":").map(Number);
    const pickupOffset = 30 + Math.floor(Math.random() * 30); // 30-60 mins
    const pickupHours = hours! - Math.floor(pickupOffset / 60);
    const pickupMins = (mins! - (pickupOffset % 60) + 60) % 60;
    const pickupTime = `${String(pickupHours).padStart(2, "0")}:${String(pickupMins).padStart(2, "0")}`;

    // Assign guide randomly if we have guides and flag is set
    const assignedGuide = assignGuide && guides.length > 0 ? randomItem(guides) : null;

    const [booking] = await db
      .insert(schema.bookings)
      .values({
        organizationId: org.id,
        referenceNumber: generateRefNumber(),
        customerId: customer.id,
        tourId: tour.id,
        bookingDate: date,
        bookingTime: time,
        adultCount: participants,
        childCount: 0,
        infantCount: 0,
        totalParticipants: participants,
        subtotal: total,
        total: total,
        currency: "AED",
        status,
        paymentStatus,
        paidAmount,
        confirmedAt: status === "confirmed" ? new Date() : null,
        source: "manual",
        specialRequests: randomItem(specialRequests),
        // Pickup info for dispatch
        pickupZoneId: pickupZone.id,
        pickupLocation: pickup.name,
        pickupAddress: pickup.address,
        pickupTime,
        // Guide assignment (if applicable)
        assignedGuideId: assignedGuide?.id ?? null,
        assignedAt: assignedGuide ? new Date() : null,
        isFirstTime: Math.random() > 0.7, // 30% are first-timers
      })
      .returning();

    // Create participants
    for (let p = 0; p < participants; p++) {
      await db.insert(schema.bookingParticipants).values({
        organizationId: org.id,
        bookingId: booking!.id,
        firstName: p === 0 ? customer.firstName : `Guest ${p}`,
        lastName: p === 0 ? customer.lastName : customer.lastName,
        email: p === 0 ? customer.email : null,
        type: "adult",
      });
    }

    bookingsCreated++;
    return booking!;
  }

  // Yesterday: 8-12 bookings (past tours, for historical data)
  console.log("\n📅 Creating yesterday's bookings...");
  for (const tour of tours) {
    const times = timeSlots.slice(0, 2); // Morning tours only
    for (const time of times) {
      const bookingCount = 2 + Math.floor(Math.random() * 3); // 2-4 bookings per slot
      for (let i = 0; i < bookingCount; i++) {
        await createBooking(yesterday, time, tour, true); // All assigned (past)
      }
    }
  }

  // Today: 15-25 bookings (some assigned, some not - for active dispatch testing)
  console.log("📅 Creating today's bookings...");
  for (const tour of tours) {
    for (const time of timeSlots) {
      const bookingCount = 2 + Math.floor(Math.random() * 4); // 2-5 bookings per slot
      for (let i = 0; i < bookingCount; i++) {
        // 60% assigned, 40% unassigned (for testing assignment)
        const assignGuide = Math.random() > 0.4;
        await createBooking(today, time, tour, assignGuide);
      }
    }
  }

  // Tomorrow: 10-18 bookings (mostly unassigned - for planning)
  console.log("📅 Creating tomorrow's bookings...");
  for (const tour of tours) {
    for (const time of timeSlots.slice(0, 3)) {
      // Skip last slot
      const bookingCount = 1 + Math.floor(Math.random() * 3); // 1-3 bookings per slot
      for (let i = 0; i < bookingCount; i++) {
        // 30% assigned, 70% unassigned (for planning)
        const assignGuide = Math.random() > 0.7;
        await createBooking(tomorrow, time, tour, assignGuide);
      }
    }
  }

  console.log(`\n✅ Created ${bookingsCreated} bookings total`);
  console.log("\n📊 Summary:");
  console.log(`   - Organization: ${org.name}`);
  console.log(`   - Tours used: ${tours.length}`);
  console.log(`   - Guides available: ${guides.length}`);
  console.log(`   - Pickup zones: ${pickupZones.length}`);
  console.log(`   - Customers: ${customers.length}`);
  console.log("\n🎉 Seed complete! Refresh your Command Center to see the bookings.");

  await client.end();
}

main().catch((err) => {
  console.error("Error seeding database:", err);
  process.exit(1);
});
