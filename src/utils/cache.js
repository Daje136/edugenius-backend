// Cache utility — uses Redis if available, falls back to in-memory
let redisClient = null;

try {
  const redis = require('../config/redis');
  redisClient = redis;
} catch {
  // Redis not configured — using in-memory fallback
}

const memoryCache = new Map();

async function cacheGet(key) {
  try {
    if (redisClient) {
      const val = await redisClient.get(key);
      return val ? JSON.parse(val) : null;
    }
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { memoryCache.delete(key); return null; }
    return entry.value;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    if (redisClient) {
      await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } else {
      memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
  } catch {
    // Cache write failure is non-fatal
  }
}

async function cacheDel(key) {
  try {
    if (redisClient) {
      await redisClient.del(key);
    } else {
      memoryCache.delete(key);
    }
  } catch {
    // Cache delete failure is non-fatal
  }
}

module.exports = { cacheGet, cacheSet, cacheDel };