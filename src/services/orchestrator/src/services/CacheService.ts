/**
 * CacheService — In-memory cache with Redis-compatible interface.
 * Currently uses in-memory Map, designed to be swapped to ElastiCache Redis later.
 *
 * Features:
 * - TTL-based expiration
 * - Namespace prefixes for different data types
 * - Rate limiting support
 * - Cache stats tracking
 */

interface CacheEntry {
  value: string;
  expiresAt: number; // Unix timestamp ms
}

class CacheServiceImpl {
  private store = new Map<string, CacheEntry>();
  private stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Get and parse JSON from cache
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set a value with TTL (in seconds)
   */
  async set(key: string, value: string, ttlSeconds: number = 300): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.stats.sets++;
  }

  /**
   * Set JSON value with TTL
   */
  async setJSON(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.stats.deletes++;
  }

  /**
   * Delete all keys matching a pattern (e.g., "user:*")
   */
  async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Increment a counter (for rate limiting)
   * Returns the new value
   */
  async incr(key: string, ttlSeconds: number = 60): Promise<number> {
    const current = await this.get(key);
    const newVal = (parseInt(current || '0') || 0) + 1;
    await this.set(key, String(newVal), ttlSeconds);
    return newVal;
  }

  // ─── Rate Limiting ───────────────────────────

  /**
   * Check rate limit: returns { allowed, remaining, resetIn }
   */
  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    current: number;
    remaining: number;
    resetInSeconds: number;
  }> {
    const key = `ratelimit:${identifier}`;
    const current = await this.incr(key, windowSeconds);
    const entry = this.store.get(key);
    const resetIn = entry ? Math.ceil((entry.expiresAt - Date.now()) / 1000) : windowSeconds;

    return {
      allowed: current <= maxRequests,
      current,
      remaining: Math.max(0, maxRequests - current),
      resetInSeconds: resetIn,
    };
  }

  // ─── Cache-Aside Pattern ────────────────────────────

  /**
   * Get from cache or fetch & store
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.getJSON<T>(key);
    if (cached !== null) return cached;

    const fresh = await fetcher();
    await this.setJSON(key, fresh, ttlSeconds);
    return fresh;
  }

  // ─── Namespaced Keys ────────────────────────────────

  /** User cache: TTL 5 min */
  userKey(userId: string) {
    return `user:${userId}`;
  }
  /** Tenant settings cache: TTL 10 min */
  tenantKey(tenantId: string) {
    return `tenant:${tenantId}`;
  }
  /** AI response cache: TTL 30 min */
  aiKey(hash: string) {
    return `ai:${hash}`;
  }
  /** Dashboard stats: TTL 2 min */
  dashKey(tenantId: string) {
    return `dash:${tenantId}`;
  }

  // ─── Stats & Cleanup ───────────────────────────────

  getStats() {
    const totalKeys = this.store.size;
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100)
        : 0;
    return { ...this.stats, totalKeys, hitRate, backend: 'in-memory' };
  }

  private cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(
        `🧹 Cache cleanup: ${cleaned} expired entries removed, ${this.store.size} remaining`
      );
    }
  }

  /** Reset (for testing) */
  flush() {
    this.store.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  destroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton export
export const CacheService = new CacheServiceImpl();
export default CacheService;
