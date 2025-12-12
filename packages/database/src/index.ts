import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy initialization to avoid crashes when DATABASE_URL is not set
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const queryClient = postgres(databaseUrl);
    _db = drizzle(queryClient, { schema });
  }
  return _db;
}

// For backwards compatibility - will throw if DATABASE_URL is not set
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    const database = getDb();
    return (database as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Re-export schema and types
export * from "./schema";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Re-export drizzle-orm helpers to ensure single instance across monorepo
export { eq, and, or, not, gt, gte, lt, lte, ne, sql, desc, asc, isNull, isNotNull, inArray, notInArray, like, ilike, between, count } from "drizzle-orm";
