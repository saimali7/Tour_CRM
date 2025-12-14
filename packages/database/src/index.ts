import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy initialization to avoid crashes when DATABASE_URL is not set at build time
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _initError: Error | null = null;

export function getDb() {
  if (_initError) {
    throw _initError;
  }
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      // During build, return a mock that will fail at runtime
      if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
        console.warn("DATABASE_URL not set - database calls will fail at runtime");
      }
      _initError = new Error("DATABASE_URL environment variable is not set");
      throw _initError;
    }
    try {
      const queryClient = postgres(databaseUrl);
      _db = drizzle(queryClient, { schema });
    } catch (err) {
      _initError = err as Error;
      throw _initError;
    }
  }
  return _db;
}

// For backwards compatibility - uses Proxy for lazy access
// The proxy only triggers getDb() when a property is actually accessed
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(target, prop, receiver) {
    // Skip certain properties that might be checked during build/bundling
    if (prop === "then" || prop === Symbol.toStringTag || prop === Symbol.iterator) {
      return undefined;
    }
    const database = getDb();
    const value = (database as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(database);
    }
    return value;
  },
});

// Re-export schema and types
export * from "./schema";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Re-export drizzle-orm helpers to ensure single instance across monorepo
export { eq, and, or, not, gt, gte, lt, lte, ne, sql, desc, asc, isNull, isNotNull, inArray, notInArray, like, ilike, between, count } from "drizzle-orm";
