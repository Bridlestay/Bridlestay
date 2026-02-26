/**
 * Simple in-memory cache for client-side data
 * Reduces redundant API calls for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired items
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get or fetch data
   * Returns cached data if available, otherwise fetches and caches
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  }
}

// Singleton instance
export const cache = new SimpleCache();

/**
 * Cache keys for common data
 */
export const CACHE_KEYS = {
  // Properties
  featuredProperties: 'featured-properties',
  propertyDetail: (id: string) => `property:${id}`,
  propertyList: (filters: string) => `properties:${filters}`,

  // Routes
  publicRoutes: 'public-routes',
  routeDetail: (id: string) => `route:${id}`,

  // User
  currentUser: 'current-user',
  userProfile: (id: string) => `user:${id}`,

  // Misc
  counties: 'counties',
  amenities: 'amenities',
};

/**
 * Cache TTLs
 */
export const CACHE_TTL = {
  short: 1 * 60 * 1000, // 1 minute
  medium: 5 * 60 * 1000, // 5 minutes
  long: 15 * 60 * 1000, // 15 minutes
  weather: 30 * 60 * 1000, // 30 minutes
  hour: 60 * 60 * 1000, // 1 hour
};

// Clear expired items periodically (every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => cache.clearExpired(), 5 * 60 * 1000);
}

