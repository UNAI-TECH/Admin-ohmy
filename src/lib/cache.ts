/**
 * Lightweight In-Memory TTL Cache
 *
 * Simple Map-based cache with automatic expiry.
 * Designed for client-side dashboards that query Supabase directly
 * and cannot leverage server-side Redis.
 */

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<any>>();

/**
 * Retrieve a cached value. Returns null on miss or expiry.
 */
export function getMemCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Store a value with a TTL in milliseconds.
 */
export function setMemCache<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Invalidate all keys that start with the given prefix.
 */
export function invalidateMemCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Clear the entire cache (e.g. on logout).
 */
export function clearMemCache(): void {
  store.clear();
}
