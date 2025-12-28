/**
 * Seed script to create test bookings for today and tomorrow
 * Run with: npx tsx packages/database/scripts/seed-bookings.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc } from "drizzle-orm";
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
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to get random item from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// Test customer data
const testCustomers = [
  { firstName: "John", lastName: "Smith", email: "john.smith@example.com", phone: "+1-415-555-0101" },
  { firstName: "Sarah", lastName: "Johnson", email: "sarah.j@example.com", phone: "+1-415-555-0102" },
  { firstName: "Michael", lastName: "Brown", email: "m.brown@example.com", phone: "+1-415-555-0103" },
  { firstName: "Emily", lastName: "Davis", email: "emily.d@example.com", phone: "+1-415-555-0104" },
  { firstName: "David", lastName: "Wilson", email: "dwilson@example.com", phone: "+1-415-555-0105" },
  { firstName: "Lisa", lastName: "Taylor", email: "lisa.t@example.com", phone: "+1-415-555-0106" },
  { firstName: "James", lastName: "Anderson", email: "j.anderson@example.com", phone: "+1-415-555-0107" },
  { firstName: "Jennifer", lastName: "Martinez", email: "jen.m@example.com", phone: "+1-415-555-0108" },
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
];

async function main() {
  console.log("🌱 Seeding test bookings...\n");

  // 1. Find an organization
  const orgs = await db.select().from(schema.organizations).limit(1);
  if (orgs.length === 0) {
    console.error("❌ No organizations found. Please create an organization first.");
    process.exit(1);
  }
  const org = orgs[0]!;
  console.log(`📍 Using organization: ${org.name} (${org.id})`);

  // 2. Find or create tours
  let tours = await db
    .select()
    .from(schema.tours)
    .where(eq(schema.tours.organizationId, org.id))
    .limit(3);

  if (tours.length === 0) {
    console.log("📝 No tours found, creating sample tours...");

    const tourData = [
      { name: "Alcatraz Night Tour", duration: 180, maxParticipants: 20, price: "89.00" },
      { name: "Golden Gate Bridge Walk", duration: 120, maxParticipants: 15, price: "45.00" },
      { name: "Wine Country Day Trip", duration: 480, maxParticipants: 12, price: "175.00" },
    ];

    for (const t of tourData) {
      const [tour] = await db.insert(schema.tours).values({
        organizationId: org.id,
        name: t.name,
        description: `Experience the best of ${t.name}`,
        duration: t.duration,
        maxParticipants: t.maxParticipants,
        basePrice: t.price,
        currency: "USD",
        status: "active",
        isPublic: true,
      }).returning();
      tours.push(tour!);
    }
    console.log(`✅ Created ${tours.length} tours`);
  } else {
    console.log(`✅ Found ${tours.length} existing tours`);
  }

  // 3. Create schedules for today and tomorrow
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeSlots = ["09:00", "11:00", "14:00", "16:30"];
  const schedules: (typeof schema.schedules.$inferSelect)[] = [];

  for (const tour of tours) {
    // Today's schedules
    for (const time of timeSlots.slice(0, 2)) {
      const [hours, minutes] = time.split(":").map(Number);
      const startsAt = new Date(today);
      startsAt.setHours(hours!, minutes!, 0, 0);

      const endsAt = new Date(startsAt);
      endsAt.setMinutes(endsAt.getMinutes() + (tour.duration || 120));

      // Check if schedule exists
      const existing = await db.select().from(schema.schedules)
        .where(and(
          eq(schema.schedules.organizationId, org.id),
          eq(schema.schedules.tourId, tour.id),
          eq(schema.schedules.startsAt, startsAt)
        ))
        .limit(1);

      if (existing.length === 0) {
        const [schedule] = await db.insert(schema.schedules).values({
          organizationId: org.id,
          tourId: tour.id,
          startsAt,
          endsAt,
          maxParticipants: tour.maxParticipants || 15,
          bookedCount: 0,
          guidesRequired: 1,
          guidesAssigned: Math.random() > 0.3 ? 1 : 0, // 70% have guide assigned
          status: "scheduled",
        }).returning();
        schedules.push(schedule!);
      } else {
        schedules.push(existing[0]!);
      }
    }

    // Tomorrow's schedules
    for (const time of timeSlots) {
      const [hours, minutes] = time.split(":").map(Number);
      const startsAt = new Date(tomorrow);
      startsAt.setHours(hours!, minutes!, 0, 0);

      const endsAt = new Date(startsAt);
      endsAt.setMinutes(endsAt.getMinutes() + (tour.duration || 120));

      const existing = await db.select().from(schema.schedules)
        .where(and(
          eq(schema.schedules.organizationId, org.id),
          eq(schema.schedules.tourId, tour.id),
          eq(schema.schedules.startsAt, startsAt)
        ))
        .limit(1);

      if (existing.length === 0) {
        const [schedule] = await db.insert(schema.schedules).values({
          organizationId: org.id,
          tourId: tour.id,
          startsAt,
          endsAt,
          maxParticipants: tour.maxParticipants || 15,
          bookedCount: 0,
          guidesRequired: 1,
          guidesAssigned: Math.random() > 0.5 ? 1 : 0, // 50% have guide assigned
          status: "scheduled",
        }).returning();
        schedules.push(schedule!);
      } else {
        schedules.push(existing[0]!);
      }
    }
  }
  console.log(`✅ Created/found ${schedules.length} schedules`);

  // 4. Create customers
  const customers: (typeof schema.customers.$inferSelect)[] = [];

  for (const c of testCustomers) {
    const existing = await db.select().from(schema.customers)
      .where(and(
        eq(schema.customers.organizationId, org.id),
        eq(schema.customers.email, c.email)
      ))
      .limit(1);

    if (existing.length === 0) {
      const [customer] = await db.insert(schema.customers).values({
        organizationId: org.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
      }).returning();
      customers.push(customer!);
    } else {
      customers.push(existing[0]!);
    }
  }
  console.log(`✅ Created/found ${customers.length} customers`);

  // 5. Create bookings
  let bookingsCreated = 0;

  // Get today's and tomorrow's schedules
  const todaySchedules = schedules.filter(s => {
    const d = new Date(s.startsAt);
    return d.toDateString() === today.toDateString();
  });

  const tomorrowSchedules = schedules.filter(s => {
    const d = new Date(s.startsAt);
    return d.toDateString() === tomorrow.toDateString();
  });

  console.log(`\n📅 Today's schedules: ${todaySchedules.length}`);
  console.log(`📅 Tomorrow's schedules: ${tomorrowSchedules.length}`);

  // Create 3-5 bookings for each of today's schedules
  for (const schedule of todaySchedules) {
    const bookingCount = 2 + Math.floor(Math.random() * 3); // 2-4 bookings
    let scheduleBookedCount = 0;

    for (let i = 0; i < bookingCount; i++) {
      const customer = randomItem(customers);
      const participants = 1 + Math.floor(Math.random() * 4); // 1-4 participants
      const tour = tours.find(t => t.id === schedule.tourId)!;
      const basePrice = parseFloat(tour.basePrice || "50");
      const total = (basePrice * participants).toFixed(2);

      // Randomize status and payment
      const statusRoll = Math.random();
      const status = statusRoll > 0.2 ? "confirmed" : "pending"; // 80% confirmed
      const paymentRoll = Math.random();
      const paymentStatus = paymentRoll > 0.3 ? "paid" : paymentRoll > 0.1 ? "partial" : "pending";
      const paidAmount = paymentStatus === "paid" ? total :
                         paymentStatus === "partial" ? (parseFloat(total) * 0.5).toFixed(2) : "0";

      const [booking] = await db.insert(schema.bookings).values({
        organizationId: org.id,
        referenceNumber: generateRefNumber(),
        customerId: customer.id,
        scheduleId: schedule.id,
        tourId: schedule.tourId,
        bookingDate: new Date(schedule.startsAt),
        bookingTime: new Date(schedule.startsAt).toTimeString().slice(0, 5),
        adultCount: participants,
        childCount: 0,
        infantCount: 0,
        totalParticipants: participants,
        subtotal: total,
        total: total,
        currency: "USD",
        status,
        paymentStatus,
        paidAmount,
        confirmedAt: status === "confirmed" ? new Date() : null,
        source: "manual",
        specialRequests: randomItem(specialRequests),
      }).returning();

      scheduleBookedCount += participants;
      bookingsCreated++;

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
    }

    // Update schedule booked count
    await db.update(schema.schedules)
      .set({ bookedCount: scheduleBookedCount })
      .where(eq(schema.schedules.id, schedule.id));
  }

  // Create 2-4 bookings for each of tomorrow's schedules
  for (const schedule of tomorrowSchedules) {
    const bookingCount = 1 + Math.floor(Math.random() * 3); // 1-3 bookings
    let scheduleBookedCount = 0;

    for (let i = 0; i < bookingCount; i++) {
      const customer = randomItem(customers);
      const participants = 1 + Math.floor(Math.random() * 3); // 1-3 participants
      const tour = tours.find(t => t.id === schedule.tourId)!;
      const basePrice = parseFloat(tour.basePrice || "50");
      const total = (basePrice * participants).toFixed(2);

      // Tomorrow's bookings are more likely to be pending
      const statusRoll = Math.random();
      const status = statusRoll > 0.4 ? "confirmed" : "pending"; // 60% confirmed
      const paymentRoll = Math.random();
      const paymentStatus = paymentRoll > 0.5 ? "paid" : paymentRoll > 0.2 ? "partial" : "pending";
      const paidAmount = paymentStatus === "paid" ? total :
                         paymentStatus === "partial" ? (parseFloat(total) * 0.5).toFixed(2) : "0";

      const [booking] = await db.insert(schema.bookings).values({
        organizationId: org.id,
        referenceNumber: generateRefNumber(),
        customerId: customer.id,
        scheduleId: schedule.id,
        tourId: schedule.tourId,
        bookingDate: new Date(schedule.startsAt),
        bookingTime: new Date(schedule.startsAt).toTimeString().slice(0, 5),
        adultCount: participants,
        childCount: 0,
        infantCount: 0,
        totalParticipants: participants,
        subtotal: total,
        total: total,
        currency: "USD",
        status,
        paymentStatus,
        paidAmount,
        confirmedAt: status === "confirmed" ? new Date() : null,
        source: "manual",
        specialRequests: randomItem(specialRequests),
      }).returning();

      scheduleBookedCount += participants;
      bookingsCreated++;

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
    }

    // Update schedule booked count
    await db.update(schema.schedules)
      .set({ bookedCount: scheduleBookedCount })
      .where(eq(schema.schedules.id, schedule.id));
  }

  console.log(`\n✅ Created ${bookingsCreated} bookings total`);
  console.log("\n🎉 Seed complete! Refresh your dashboard to see the bookings.");

  await client.end();
}

main().catch((err) => {
  console.error("Error seeding database:", err);
  process.exit(1);
});
