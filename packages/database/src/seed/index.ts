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
  // Create test tours
  console.log("Creating test tours...");
  const tours = await db
    .insert(schema.tours)
    .values([
      {
        id: createId(),
        organizationId: orgId,
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
        status: "active",
        isPublic: true,
      },
      {
        id: createId(),
        organizationId: orgId,
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
        status: "active",
        isPublic: true,
      },
      {
        id: createId(),
        organizationId: orgId,
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
        status: "active",
        isPublic: true,
      },
    ])
    .onConflictDoNothing()
    .returning();

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

  console.log("✅ Seed completed successfully!\n");
  console.log("Test organization credentials:");
  console.log("  Slug: demo-tours");
  console.log("  URL: http://localhost:3000/org/demo-tours");
  console.log("\nNote: You'll need to create a user and add them to this organization to access it.");
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
