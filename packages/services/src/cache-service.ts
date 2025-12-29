import Redis from "ioredis";

// Cache key prefixes for different data types
export const CachePrefix = {
  SESSION: "session:",
  TOUR_AVAILABILITY: "tour:availability:",
  SCHEDULE: "schedule:",
  PRICING: "pricing:",
  CUSTOMER: "customer:",
  ORGANIZATION: "org:",
  RATE_LIMIT: "ratelimit:",
  FEATURE_FLAG: "feature:",
} as const;

// Default TTL values (in seconds)
export const CacheTTL = {
  SHORT: 60, // 1 minute - for frequently changing data
  MEDIUM: 300, // 5 minutes - for moderately changing data
  LONG: 3600, // 1 hour - for relatively static data
  VERY_LONG: 86400, // 24 hours - for rarely changing data
  SESSION: 604800, // 7 days - for session data
} as const;

export interface CacheConfig {
  url?: string;
  keyPrefix?: string;
  defaultTTL?: number;
}

/**
 * Redis-based caching service
 * Provides a clean abstraction over Redis for application caching needs
 */
export class CacheService {
  private redis: Redis | null = null;
  private config: CacheConfig;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(config?: CacheConfig) {
    this.config = {
      url: config?.url || process.env.REDIS_URL,
      keyPrefix: config?.keyPrefix || "tour:",
      defaultTTL: config?.defaultTTL || CacheTTL.MEDIUM,
    };
  }

  /**
   * Lazily connect to Redis
   */
  private async ensureConnection(): Promise<Redis | null> {
    if (this.isConnected && this.redis) {
      return this.redis;
    }

    if (!this.config.url) {
      return null; // Redis not configured, silently skip caching
    }

    // If already connecting, wait for that
    if (this.connectionPromise) {
      await this.connectionPromise;
      return this.redis;
    }

    this.connectionPromise = this.connect();
    await this.connectionPromise;
    return this.redis;
  }

  private async connect(): Promise<void> {
    try {
      this.redis = new Redis(this.config.url!, {
        lazyConnect: true,
        connectTimeout: 5000,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 200, 1000);
        },
      });

      await this.redis.connect();
      this.isConnected = true;

      this.redis.on("error", (err) => {
        console.error("[CacheService] Redis error:", err.message);
        this.isConnected = false;
      });

      this.redis.on("close", () => {
        this.isConnected = false;
      });

      this.redis.on("reconnecting", () => {
        console.log("[CacheService] Redis reconnecting...");
      });
    } catch (error) {
      console.warn("[CacheService] Failed to connect to Redis:", error);
      this.redis = null;
      this.isConnected = false;
    }
  }

  /**
   * Build a cache key with the configured prefix
   */
  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const redis = await this.ensureConnection();
    if (!redis) return null;

    try {
      const value = await redis.get(this.buildKey(key));
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error("[CacheService] Get error:", error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    const redis = await this.ensureConnection();
    if (!redis) return false;

    try {
      const ttl = ttlSeconds ?? this.config.defaultTTL!;
      await redis.set(this.buildKey(key), JSON.stringify(value), "EX", ttl);
      return true;
    } catch (error) {
      console.error("[CacheService] Set error:", error);
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    const redis = await this.ensureConnection();
    if (!redis) return false;

    try {
      await redis.del(this.buildKey(key));
      return true;
    } catch (error) {
      console.error("[CacheService] Delete error:", error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const redis = await this.ensureConnection();
    if (!redis) return 0;

    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await redis.keys(fullPattern);
      if (keys.length === 0) return 0;
      return await redis.del(...keys);
    } catch (error) {
      console.error("[CacheService] DeletePattern error:", error);
      return 0;
    }
  }

  /**
   * Get or set a cached value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, fetch from factory
    const value = await factory();

    // Store in cache (fire and forget)
    this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Increment a counter (useful for rate limiting)
   */
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const redis = await this.ensureConnection();
    if (!redis) return 0;

    try {
      const fullKey = this.buildKey(key);
      const value = await redis.incr(fullKey);
      if (ttlSeconds && value === 1) {
        // First increment, set TTL
        await redis.expire(fullKey, ttlSeconds);
      }
      return value;
    } catch (error) {
      console.error("[CacheService] Increment error:", error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const redis = await this.ensureConnection();
    if (!redis) return false;

    try {
      const result = await redis.exists(this.buildKey(key));
      return result === 1;
    } catch (error) {
      console.error("[CacheService] Exists error:", error);
      return false;
    }
  }

  /**
   * Set a hash field
   */
  async hset(key: string, field: string, value: unknown): Promise<boolean> {
    const redis = await this.ensureConnection();
    if (!redis) return false;

    try {
      await redis.hset(this.buildKey(key), field, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("[CacheService] Hset error:", error);
      return false;
    }
  }

  /**
   * Get a hash field
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    const redis = await this.ensureConnection();
    if (!redis) return null;

    try {
      const value = await redis.hget(this.buildKey(key), field);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error("[CacheService] Hget error:", error);
      return null;
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null> {
    const redis = await this.ensureConnection();
    if (!redis) return null;

    try {
      const data = await redis.hgetall(this.buildKey(key));
      if (!data || Object.keys(data).length === 0) return null;

      const result: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      return result as T;
    } catch (error) {
      console.error("[CacheService] Hgetall error:", error);
      return null;
    }
  }

  /**
   * Health check - returns connection status and latency
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    message?: string;
  }> {
    if (!this.config.url) {
      return { healthy: false, message: "Redis not configured" };
    }

    const startTime = Date.now();

    try {
      const redis = await this.ensureConnection();
      if (!redis) {
        return { healthy: false, message: "Failed to connect to Redis" };
      }

      await redis.ping();
      return {
        healthy: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : "Unknown error",
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Gracefully close the Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
  }
}

// Global singleton instance
let globalCache: CacheService | null = null;

/**
 * Get the global cache service instance
 */
export function getCache(): CacheService {
  if (!globalCache) {
    globalCache = new CacheService();
  }
  return globalCache;
}

/**
 * Create a new cache service instance with custom config
 */
export function createCacheService(config?: CacheConfig): CacheService {
  return new CacheService(config);
}

/**
 * Check if Redis cache is configured
 */
export function isCacheConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

/**
 * Perform a health check on Redis
 */
export async function checkCacheHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  message?: string;
}> {
  if (!isCacheConfigured()) {
    return { healthy: false, message: "Redis not configured" };
  }

  return getCache().healthCheck();
}

// =============================================================================
// Organization-scoped caching helpers
// =============================================================================

/**
 * Build an organization-scoped cache key
 */
export function orgCacheKey(
  organizationId: string,
  prefix: string,
  ...parts: (string | number)[]
): string {
  return `${CachePrefix.ORGANIZATION}${organizationId}:${prefix}:${parts.join(":")}`;
}

/**
 * Invalidate all cache for an organization
 */
export async function invalidateOrgCache(organizationId: string): Promise<number> {
  return getCache().deletePattern(`${CachePrefix.ORGANIZATION}${organizationId}:*`);
}

/**
 * Invalidate specific cache type for an organization
 */
export async function invalidateOrgCacheType(
  organizationId: string,
  prefix: string
): Promise<number> {
  return getCache().deletePattern(`${CachePrefix.ORGANIZATION}${organizationId}:${prefix}*`);
}
