/**
 * Simple in-memory cache with TTL.
 * Avoids Redis dependency for this scale.
 */
class CacheService {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlMs = 60000) {
    this.cache.set(key, { value, expiry: Date.now() + ttlMs });
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key);
    }
  }

  clear() {
    this.cache.clear();
  }
}

module.exports = new CacheService();
