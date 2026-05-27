'use strict';
const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient;

async function connectRedis() {
  // Skip if no URL provided
  if (!process.env.REDIS_URL) {
    logger.warn('⚠️  Redis skipped — REDIS_URL not set');
    return;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: process.env.REDIS_URL.startsWith('rediss://'), // true for Upstash
        rejectUnauthorized: false,
      },
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis error:', err.message);
    });

    await redisClient.connect();
    logger.info('✅ Redis connected');

  } catch (err) {
    logger.warn('⚠️  Redis not connected:', err.message);
  }
}

function getRedis() {
  return redisClient || null;
}

async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    if (!redisClient) return;
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch { /* non-fatal */ }
}

async function cacheGet(key) {
  try {
    if (!redisClient) return null;
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function cacheDel(key) {
  try {
    if (!redisClient) return;
    await redisClient.del(key);
  } catch { /* non-fatal */ }
}

module.exports = { connectRedis, getRedis, cacheSet, cacheGet, cacheDel };