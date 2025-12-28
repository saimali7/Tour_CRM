import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { createId } from "../utils";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../../../../.env.local") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

// Generate a unique reference number (same logic as base-service.ts)
// Format: PREFIX-XXXXXX (6 easy-to-read alphanumeric chars, no 0/O/1/I/L)
function generateReferenceNumber(prefix: string): string {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // Create a test organization
  console.log("Creating test organization...");
  const [org] = await db
    .insert(schema.organizations)
    .values({
      id: createId(),
      name: "Demo Tours",
      slug: "demo-tours",
      email: "hello@demo-tours.com",
      phone: "+1 555 123 4567",
      website: "https://demo-tours.com",
      address: "123 Main Street",
      city: "San Francisco",
      state: "CA",
      country: "US",
      postalCode: "94105",
      timezone: "America/Los_Angeles",
      primaryColor: "#0066FF",
      status: "active",
      plan: "pro",
      settings: {
        defaultCurrency: "USD",
        defaultLanguage: "en",
        emailNotifications: true,
        smsNotifications: false,
      },
    })
    .onConflictDoNothing()
    .returning();

  if (!org) {
    console.log("Organization already exists, fetching...");
    const existingOrg = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.slug, "demo-tours"),
    });
    if (existingOrg) {
      console.log(`  ✓ Organization: ${existingOrg.name} (${existingOrg.slug})\n`);
      await seedOrgData(existingOrg.id);
    }
    return;
  }

  console.log(`  ✓ Organization: ${org.name} (${org.slug})\n`);

  await seedOrgData(org.id);
}

async function seedOrgData(orgId: string) {
  // Create test tours (with products first per new hierarchy)
  console.log("Creating test tours...");

  // Define tour data
  const tourData = [
    {
      name: "Golden Gate Bridge Walking Tour",
      slug: "golden-gate-walking-tour",
      description:
        "Experience the iconic Golden Gate Bridge up close on this guided walking tour. Learn about the engineering marvel and history of San Francisco's most famous landmark.",
      shortDescription:
        "A scenic walk across the Golden Gate Bridge with expert commentary.",
      durationMinutes: 120,
      minParticipants: 1,
      maxParticipants: 15,
      basePrice: "49.00",
      currency: "USD",
      meetingPoint: "Golden Gate Bridge Welcome Center",
      meetingPointDetails:
        "Meet at the statue near the main entrance. Look for the guide with the orange umbrella.",
      category: "Walking Tour",
      tags: ["outdoor", "sightseeing", "photography", "family-friendly"],
      includes: [
        "Expert guide",
        "Historical commentary",
        "Photo opportunities",
        "Bottled water",
      ],
      excludes: ["Transportation to/from meeting point", "Gratuities"],
      requirements: [
        "Comfortable walking shoes",
        "Weather-appropriate clothing",
        "Camera recommended",
      ],
      status: "active" as const,
      isPublic: true,
    },
    {
      name: "Alcatraz Night Tour",
      slug: "alcatraz-night-tour",
      description:
        "Visit the legendary Alcatraz Island as the sun sets over San Francisco Bay. This evening tour offers a unique atmosphere and smaller crowds.",
      shortDescription:
        "An evening tour of Alcatraz Island with dramatic views and stories.",
      durationMinutes: 180,
      minParticipants: 1,
      maxParticipants: 30,
      basePrice: "89.00",
      currency: "USD",
      meetingPoint: "Pier 33, Alcatraz Landing",
      meetingPointDetails:
        "Check in at the ticket booth 30 minutes before departure.",
      category: "Historical Tour",
      tags: ["historical", "island", "evening", "popular"],
      includes: [
        "Ferry transportation",
        "Audio guide",
        "Access to cellhouse",
        "Expert guide presentation",
      ],
      excludes: ["Food and drinks", "Gratuities"],
      requirements: [
        "Warm layers (it gets cold)",
        "Comfortable walking shoes",
        "Valid ID required",
      ],
      status: "active" as const,
      isPublic: true,
    },
    {
      name: "San Francisco Food Tour",
      slug: "sf-food-tour",
      description:
        "Taste your way through San Francisco's diverse culinary scene. Visit local favorites in the Mission, North Beach, and Chinatown neighborhoods.",
      shortDescription:
        "A culinary adventure through SF's best food neighborhoods.",
      durationMinutes: 240,
      minParticipants: 2,
      maxParticipants: 12,
      basePrice: "129.00",
      currency: "USD",
      meetingPoint: "Ferry Building Marketplace",
      meetingPointDetails:
        "Meet inside, near the coffee shop to the left of the main entrance.",
      category: "Food & Drink",
      tags: ["food", "culinary", "walking", "local-favorites"],
      includes: [
        "8+ food tastings",
        "Local guide",
        "Food history and stories",
        "Neighborhood walking tour",
      ],
      excludes: ["Additional drinks", "Gratuities", "Transportation"],
      requirements: [
        "Come hungry!",
        "Comfortable walking shoes",
        "Please inform us of dietary restrictions",
      ],
      status: "active" as const,
      isPublic: true,
    },
  ];

  // Create products and tours together
  const tours = [];
  for (const data of tourData) {
    // Create product first
    const [product] = await db
      .insert(schema.products)
      .values({
        id: createId(),
        organizationId: orgId,
        type: "tour",
        name: data.name,
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription,
        status: data.status,
        visibility: data.isPublic ? "public" : "private",
        basePrice: data.basePrice,
        currency: data.currency,
        tags: data.tags,
      })
      .onConflictDoNothing()
      .returning();

    if (product) {
      // Create tour with productId
      const [tour] = await db
        .insert(schema.tours)
        .values({
          id: createId(),
          organizationId: orgId,
          productId: product.id,
          name: data.name,
          slug: data.slug,
          description: data.description,
          shortDescription: data.shortDescription,
          durationMinutes: data.durationMinutes,
          minParticipants: data.minParticipants,
          maxParticipants: data.maxParticipants,
          basePrice: data.basePrice,
          currency: data.currency,
          meetingPoint: data.meetingPoint,
          meetingPointDetails: data.meetingPointDetails,
          category: data.category,
          tags: data.tags,
          includes: data.includes,
          excludes: data.excludes,
          requirements: data.requirements,
          status: data.status,
          isPublic: data.isPublic,
        })
        .onConflictDoNothing()
        .returning();

      if (tour) tours.push(tour);
    }
  }

  console.log(`  ✓ Created ${tours.length} tours\n`);

  // Create test guides
  console.log("Creating test guides...");
  const guides = await db
    .insert(schema.guides)
    .values([
      {
        id: createId(),
        organizationId: orgId,
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah@demo-tours.com",
        phone: "+1 555 234 5678",
        bio: "Sarah has been leading tours in San Francisco for over 10 years. She's a certified historian and passionate about sharing the city's rich history.",
        shortBio: "10+ years experience, certified historian",
        languages: ["en", "es"],
        certifications: ["Certified Tour Guide", "CPR/First Aid"],
        status: "active",
        isPublic: true,
      },
      {
        id: createId(),
        organizationId: orgId,
        firstName: "Michael",
        lastName: "Chen",
        email: "michael@demo-tours.com",
        phone: "+1 555 345 6789",
        bio: "Michael is a food enthusiast and chef who brings culinary expertise to every tour. He knows all the hidden gems in the city.",
        shortBio: "Chef and culinary expert",
        languages: ["en", "zh"],
        certifications: ["Culinary Arts Degree", "Food Handler Certificate"],
        status: "active",
        isPublic: true,
      },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`  ✓ Created ${guides.length} guides\n`);

  // Create test customers
  console.log("Creating test customers...");
  const customers = await db
    .insert(schema.customers)
    .values([
      {
        id: createId(),
        organizationId: orgId,
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: "+1 555 111 2222",
        city: "New York",
        country: "US",
        source: "website",
        tags: ["repeat-customer", "vip"],
      },
      {
        id: createId(),
        organizationId: orgId,
        email: "jane.smith@example.com",
        firstName: "Jane",
        lastName: "Smith",
        phone: "+1 555 333 4444",
        city: "Los Angeles",
        country: "US",
        source: "referral",
        tags: ["family"],
      },
      {
        id: createId(),
        organizationId: orgId,
        email: "bob.wilson@example.com",
        firstName: "Bob",
        lastName: "Wilson",
        city: "Chicago",
        country: "US",
        source: "manual",
      },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`  ✓ Created ${customers.length} customers\n`);

  // Get all tours for scheduling
  const allTours = await db.query.tours.findMany({
    where: (tours, { eq }) => eq(tours.organizationId, orgId),
  });

  const allGuides = await db.query.guides.findMany({
    where: (guides, { eq }) => eq(guides.organizationId, orgId),
  });

  const allCustomers = await db.query.customers.findMany({
    where: (customers, { eq }) => eq(customers.organizationId, orgId),
  });

  // Create schedules for the next 14 days
  console.log("Creating schedules...");
  const schedulesToCreate = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);

    for (const tour of allTours) {
      // Create 2-3 time slots per tour per day
      const timeSlots = [
        { hour: 9, minute: 0 },
        { hour: 14, minute: 0 },
        ...(dayOffset % 2 === 0 ? [{ hour: 18, minute: 30 }] : []),
      ];

      for (const slot of timeSlots) {
        const startsAt = new Date(date);
        startsAt.setHours(slot.hour, slot.minute, 0, 0);

        const endsAt = new Date(startsAt);
        endsAt.setMinutes(endsAt.getMinutes() + tour.durationMinutes);

        // Randomly assign a guide
        const guide = allGuides[Math.floor(Math.random() * allGuides.length)];

        schedulesToCreate.push({
          id: createId(),
          organizationId: orgId,
          tourId: tour.id,
          startsAt,
          endsAt,
          maxParticipants: tour.maxParticipants,
          bookedCount: 0,
          guideId: guide?.id,
          guideConfirmed: guide ? Math.random() > 0.2 : false,
          status: "scheduled" as const,
          price: tour.basePrice,
        });
      }
    }
  }

  const createdSchedules = await db
    .insert(schema.schedules)
    .values(schedulesToCreate)
    .onConflictDoNothing()
    .returning();

  console.log(`  ✓ Created ${createdSchedules.length} schedules\n`);

  // Create bookings for some schedules
  console.log("Creating bookings...");
  const bookingsToCreate = [];
  const paymentsToCreate = [];
  const participantsToCreate = [];

  // Get today's and tomorrow's schedules for bookings
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const schedulesForBookings = createdSchedules.filter((s) => {
    const scheduleDate = new Date(s.startsAt);
    // Include both today and tomorrow
    return scheduleDate.getDate() === today.getDate() || scheduleDate.getDate() === tomorrow.getDate();
  });

  // Create 3-8 bookings per schedule (use up to 6 schedules for more demo data)
  for (const schedule of schedulesForBookings.slice(0, 6)) {
    const numBookings = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < numBookings; i++) {
      const customer = allCustomers[i % allCustomers.length];
      if (!customer) continue;

      const numAdults = Math.floor(Math.random() * 3) + 1;
      const numChildren = Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0;
      const totalParticipants = numAdults + numChildren;

      const basePrice = parseFloat(schedule.price || "49.00");
      const subtotal = numAdults * basePrice + numChildren * (basePrice * 0.5);
      const total = subtotal;

      const bookingId = createId();
      const statuses = ["confirmed", "pending", "confirmed", "confirmed"] as const;
      const paymentStatuses = ["paid", "pending", "partial", "paid"] as const;
      const status = statuses[i % statuses.length];
      const paymentStatus = paymentStatuses[i % paymentStatuses.length];

      bookingsToCreate.push({
        id: bookingId,
        organizationId: orgId,
        referenceNumber: generateReferenceNumber("BK"),
        customerId: customer.id,
        scheduleId: schedule.id,
        status,
        paymentStatus,
        adultCount: numAdults,
        childCount: numChildren,
        infantCount: 0,
        totalParticipants,
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        currency: "USD",
        source: ["website", "phone", "walk_in"][Math.floor(Math.random() * 3)] as "website" | "phone" | "walk_in",
      });

      // Create payment if paid or partial
      if (paymentStatus === "paid" || paymentStatus === "partial") {
        const paidAmount = paymentStatus === "paid" ? total : total * 0.5;
        paymentsToCreate.push({
          id: createId(),
          organizationId: orgId,
          bookingId,
          amount: paidAmount.toFixed(2),
          currency: "USD",
          method: ["card", "cash", "bank_transfer"][Math.floor(Math.random() * 3)] as "card" | "cash" | "bank_transfer",
          recordedBy: "seed-script",
          recordedByName: "Seed Script",
        });
      }

      // Create participants
      for (let p = 0; p < numAdults; p++) {
        participantsToCreate.push({
          id: createId(),
          organizationId: orgId,
          bookingId,
          type: "adult" as const,
          firstName: p === 0 ? customer.firstName : `Guest`,
          lastName: p === 0 ? customer.lastName : `${p + 1}`,
          email: p === 0 ? customer.email : null,
        });
      }
      for (let p = 0; p < numChildren; p++) {
        participantsToCreate.push({
          id: createId(),
          organizationId: orgId,
          bookingId,
          type: "child" as const,
          firstName: `Child`,
          lastName: `${p + 1}`,
        });
      }
    }
  }

  if (bookingsToCreate.length > 0) {
    await db.insert(schema.bookings).values(bookingsToCreate).onConflictDoNothing();
    console.log(`  ✓ Created ${bookingsToCreate.length} bookings`);
  }

  if (paymentsToCreate.length > 0) {
    await db.insert(schema.payments).values(paymentsToCreate).onConflictDoNothing();
    console.log(`  ✓ Created ${paymentsToCreate.length} payments`);
  }

  if (participantsToCreate.length > 0) {
    await db.insert(schema.bookingParticipants).values(participantsToCreate).onConflictDoNothing();
    console.log(`  ✓ Created ${participantsToCreate.length} participants`);
  }

  // Update booked counts on schedules
  const scheduleBookedCounts = new Map<string, number>();
  for (const booking of bookingsToCreate) {
    if (booking.status === "confirmed") {
      const current = scheduleBookedCounts.get(booking.scheduleId) || 0;
      scheduleBookedCounts.set(booking.scheduleId, current + booking.totalParticipants);
    }
  }

  const { eq } = await import("drizzle-orm");
  for (const [scheduleId, bookedCount] of scheduleBookedCounts) {
    await db
      .update(schema.schedules)
      .set({ bookedCount })
      .where(eq(schema.schedules.id, scheduleId));
  }

  console.log("\n✅ Seed completed successfully!\n");
  console.log("Demo data created:");
  console.log("  Organization: Demo Tours (demo-tours)");
  console.log("  Tours: 3");
  console.log("  Guides: 2");
  console.log("  Customers: 3");
  console.log(`  Schedules: ${createdSchedules.length}`);
  console.log(`  Bookings: ${bookingsToCreate.length}`);
  console.log("\nURL: http://localhost:3000/org/demo-tours");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
    process.exit(0);
  });
