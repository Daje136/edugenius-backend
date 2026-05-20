'use strict';
const { createClient } = require('redis');
const logger           = require('../utils/logger');

let redisClient;

async function connectRedis() {
  redisClient = createClient({
    url:      process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error',   (err) => logger.error('Redis error:', err));
  redisClient.on('connect', ()    => logger.info('✅ Redis connected'));

  await redisClient.connect();
}

function getRedis() {
  if (!redisClient) throw new Error('Redis not initialised');
  return redisClient;
}

// Helpers
async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    await getRedis().setEx(key, ttlSeconds, JSON.stringify(value));
  } catch { /* non-fatal */ }
}

async function cacheGet(key) {
  try {
    const raw = await getRedis().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function cacheDel(key) {
  try { await getRedis().del(key); } catch { /* non-fatal */ }
}

module.exports = { connectRedis, getRedis, cacheSet, cacheGet, cacheDel };
