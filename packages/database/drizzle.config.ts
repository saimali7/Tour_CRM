import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

// Load .env.local from project root (for local development)
// In Docker, DATABASE_URL comes from the container environment
config({ path: resolve(__dirname, "../../.env.local") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use DIRECT_URL for migrations (bypasses PgBouncer in production)
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
