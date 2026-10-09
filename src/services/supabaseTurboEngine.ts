/**
 * Doorbly Supabase Turbo Retrieval Engine
 * Provides:
 * 1. L1 In-Memory + L2 Persistent Storage Stale-While-Revalidate (SWR) Caching
 * 2. In-Flight Query Deduplication (prevents duplicate concurrent Supabase requests)
 * 3. Smart Schema Route Memoization (remembers active table/view names to eliminate 404 waterfalls)
 * 4. Parallel Batch Prefetching & Fast Timeout Guards
 */

const CACHE_PREFIX = 'doorbly_turbo_cache_v1_';

interface CacheEntry<T = any> {
  data: T;
  updatedAt: number;
  ttlMs: number;
}

// L1 In-Memory Cache for 0ms instant retrieval
const memoryCache = new Map<string, CacheEntry>();

// In-flight Promise Deduplication Map
const inflightRequests = new Map<string, Promise<any>>();

// Memoized Schema Table Resolution (avoids probing non-existent views repeatedly)
const resolvedSchemaTargets = new Map<string, string>();

// Engine performance stats
let cacheHits = 0;
let networkFetches = 0;
let lastLatencyMs = 0;

export function getResolvedSchemaTarget(key: string): string | undefined {
  return resolvedSchemaTargets.get(key);
}

export function setResolvedSchemaTarget(key: string, tableName: string): void {
  resolvedSchemaTargets.set(key, tableName);
}

/**
 * Read from L1 Memory Cache first, then L2 localStorage
 */
export function getCachedData<T>(key: string): { data: T | null; isStale: boolean } {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem) {
    cacheHits++;
    return {
      data: mem.data as T,
      isStale: now - mem.updatedAt > mem.ttlMs
    };
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (raw) {
        const parsed: CacheEntry<T> = JSON.parse(raw);
        if (parsed && parsed.data !== undefined) {
          memoryCache.set(key, parsed);
          cacheHits++;
          return {
            data: parsed.data,
            isStale: now - parsed.updatedAt > parsed.ttlMs
          };
        }
      }
    } catch {}
  }

  return { data: null, isStale: true };
}

/**
 * Write to both L1 Memory Cache and L2 localStorage
 */
export function setCachedData<T>(key: string, data: T, ttlMs: number = 60_000): void {
  const entry: CacheEntry<T> = {
    data,
    updatedAt: Date.now(),
    ttlMs
  };
  memoryCache.set(key, entry);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {}
  }
}

/**
 * Invalidate specific cache key or prefix when mutations happen
 */
export function invalidateTurboCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(k);
          }
        });
      } catch {}
    }
    return;
  }

  for (const k of Array.from(memoryCache.keys())) {
    if (k.startsWith(keyPrefix)) {
      memoryCache.delete(k);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(CACHE_PREFIX + keyPrefix)) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
  }
}

/**
 * Executes a Supabase fetcher with:
 * - Instant cached response if fresh (or Stale-While-Revalidate background refresh)
 * - In-flight request deduplication
 * - Timeout protection so slow networks never hang the UI
 */
export async function turboQuery<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: {
    ttlMs?: number;
    staleWhileRevalidate?: boolean;
    timeoutMs?: number;
    forceRefresh?: boolean;
  } = {}
): Promise<T> {
  const {
    ttlMs = 120_000, // 2 minutes default fresh TTL
    staleWhileRevalidate = true,
    timeoutMs = 4500,
    forceRefresh = false
  } = options;

  if (!forceRefresh) {
    const cached = getCachedData<T>(cacheKey);
    if (cached.data !== null) {
      if (!cached.isStale) {
        return cached.data;
      }
      if (staleWhileRevalidate) {
        // Trigger non-blocking background refresh and return cached data in 0ms
        void executeDeduplicatedFetch(cacheKey, fetcher, ttlMs, timeoutMs).catch(() => {});
        return cached.data;
      }
    }
  }

  return executeDeduplicatedFetch(cacheKey, fetcher, ttlMs, timeoutMs);
}

async function executeDeduplicatedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  timeoutMs: number
): Promise<T> {
  const existing = inflightRequests.get(cacheKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const start = performance.now();
  networkFetches++;

  const fetchPromise = (async () => {
    try {
      const result = await Promise.race<T>([
        fetcher(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timeout')), timeoutMs)
        )
      ]);
      lastLatencyMs = Math.round(performance.now() - start);
      setCachedData(cacheKey, result, ttlMs);
      return result;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export function getTurboEngineStats() {
  const total = cacheHits + networkFetches;
  return {
    cacheHits,
    networkFetches,
    hitRatePercent: total > 0 ? Math.round((cacheHits / total) * 100) : 100,
    lastLatencyMs,
    cachedKeysCount: memoryCache.size
  };
}
