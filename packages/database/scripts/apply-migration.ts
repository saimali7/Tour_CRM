import { db, sql } from "../src/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), "../../.env.local") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  console.log("🔄 Applying database schema fixes...\n");

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, "..", "migration.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Remove comments and split by semicolons
    const cleanedSQL = migrationSQL
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

    const statements = cleanedSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      // Extract a short description for logging
      const firstLine = statement.split("\n")[0].substring(0, 80);
      console.log(`[${i + 1}/${statements.length}] ${firstLine}...`);

      try {
        await db.execute(sql.raw(statement));
        console.log(`✅ Success\n`);
      } catch (error) {
        console.error(`❌ Error: ${error.message}\n`);
        // Continue with other statements even if one fails
      }
    }

    console.log("\n✅ Migration completed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

applyMigration();
