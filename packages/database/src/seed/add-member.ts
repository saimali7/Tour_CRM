import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { createId } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "../../../../.env.local") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

async function addMember() {
  const orgSlug = process.argv[2] || "demo-tours";
  const role = process.argv[3] || "owner";

  console.log(`\n🔍 Looking for users and organization "${orgSlug}"...\n`);

  // Get organization
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.slug, orgSlug),
  });

  if (!org) {
    console.error(`❌ Organization "${orgSlug}" not found`);
    process.exit(1);
  }

  // Get all users
  const users = await db.query.users.findMany();

  if (users.length === 0) {
    console.error("❌ No users found. Please sign in to the CRM first to create your user record.");
    console.log("\n1. Go to http://localhost:3000");
    console.log("2. Sign in with Clerk");
    console.log("3. Run this script again\n");
    process.exit(1);
  }

  console.log("Found users:");
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.email} (${u.firstName} ${u.lastName})`);
  });

  // If only one user, add them automatically
  const user = users[0];

  if (!user) {
    console.error("❌ No users found after query.");
    process.exit(1);
  }

  // Check if already a member
  const existingMembership = await db.query.organizationMembers.findFirst({
    where: (members, { and, eq }) =>
      and(
        eq(members.organizationId, org.id),
        eq(members.userId, user.id)
      ),
  });

  if (existingMembership) {
    console.log(`\n✅ ${user.email} is already a member of "${org.name}" (role: ${existingMembership.role})`);
    console.log(`\n🚀 Go to: http://localhost:3000/org/${org.slug}\n`);
    process.exit(0);
  }

  // Add as member
  await db.insert(schema.organizationMembers).values({
    id: createId(),
    organizationId: org.id,
    userId: user.id,
    role: role as "owner" | "admin" | "manager" | "support" | "guide",
    status: "active",
  });

  console.log(`\n✅ Added ${user.email} as ${role} of "${org.name}"`);
  console.log(`\n🚀 Go to: http://localhost:3000/org/${org.slug}\n`);
}

addMember()
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
