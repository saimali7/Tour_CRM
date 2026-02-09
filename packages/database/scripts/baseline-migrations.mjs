import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

function loadJournalEntries() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const journalPath = path.join(__dirname, "..", "drizzle", "meta", "_journal.json");

  const raw = fs.readFileSync(journalPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.entries)) {
    throw new Error("Invalid drizzle journal: entries array is missing");
  }

  return parsed.entries
    .filter((entry) => typeof entry.idx === "number" && typeof entry.when === "number" && typeof entry.tag === "string")
    .sort((a, b) => a.idx - b.idx);
}

function getEntryByTag(entries, tag) {
  return entries.find((entry) => entry.tag === tag) ?? null;
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

async function ensureMigrationsTable(sql) {
  await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
  await sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;
}

async function getDbState(sql) {
  const [row] = await sql`
    SELECT
      to_regclass('public.organizations') IS NOT NULL AS "hasOrganizations",
      to_regtype('public.goal_metric_type') IS NOT NULL AS "hasGoalMetricType",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'organizations'
          AND column_name = 'currency'
      ) AS "hasOrgCurrency",
      to_regclass('public.waitlist_entries') IS NOT NULL AS "hasWaitlistEntries",
      to_regclass('public.schedule_option_availability') IS NOT NULL AS "hasScheduleOptionAvailability"
  `;

  const hasOrganizations = toBool(row?.hasOrganizations);
  const hasGoalMetricType = toBool(row?.hasGoalMetricType);
  const hasOrgCurrency = toBool(row?.hasOrgCurrency);
  const hasWaitlistEntries = toBool(row?.hasWaitlistEntries);
  const hasScheduleOptionAvailability = toBool(row?.hasScheduleOptionAvailability);

  return {
    hasOrganizations,
    hasGoalMetricType,
    hasOrgCurrency,
    hasDroppedLegacyTables: !hasWaitlistEntries && !hasScheduleOptionAvailability,
  };
}

function resolveHighestContiguousAppliedMigration(entries, state) {
  const base = getEntryByTag(entries, "0000_loving_puck");
  if (!base) return null;

  if (!(state.hasOrganizations && state.hasGoalMetricType)) {
    return null;
  }

  let highest = base;

  const currency = getEntryByTag(entries, "0001_add-currency-column");
  if (currency && state.hasOrgCurrency) {
    highest = currency;
  }

  const dropLegacy = getEntryByTag(entries, "0002_drop-legacy-schedule-availability");
  if (dropLegacy && state.hasOrgCurrency && state.hasDroppedLegacyTables) {
    highest = dropLegacy;
  }

  return highest;
}

async function baselineIfNeeded(sql, entries) {
  await ensureMigrationsTable(sql);

  const [countRow] = await sql`
    SELECT count(*)::int AS "migrationCount"
    FROM "drizzle"."__drizzle_migrations"
  `;
  const migrationCount = Number(countRow?.migrationCount ?? 0);

  if (migrationCount > 0) {
    console.log(`[baseline] Found ${migrationCount} tracked migration(s). No baseline needed.`);
    return;
  }

  const state = await getDbState(sql);
  const highest = resolveHighestContiguousAppliedMigration(entries, state);

  if (!highest) {
    console.log("[baseline] Fresh database (or unknown legacy state). No baseline inserted.");
    return;
  }

  const toInsert = entries.filter((entry) => entry.idx <= highest.idx);
  if (toInsert.length === 0) {
    console.log("[baseline] Nothing to baseline.");
    return;
  }

  await sql.begin(async (tx) => {
    for (const entry of toInsert) {
      const hash = `baseline:${entry.tag}`;
      await tx`
        INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
        SELECT ${hash}, ${entry.when}
        WHERE NOT EXISTS (
          SELECT 1
          FROM "drizzle"."__drizzle_migrations"
          WHERE "created_at" = ${entry.when}
        )
      `;
    }
  });

  console.log(
    `[baseline] Inserted ${toInsert.length} baseline migration row(s) through ${highest.tag}.`
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required for migration baseline");
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 10,
  });

  try {
    const entries = loadJournalEntries();
    await baselineIfNeeded(sql, entries);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("[baseline] Failed to baseline migrations:", error);
  process.exit(1);
});
