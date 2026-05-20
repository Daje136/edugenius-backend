'use strict';

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'edugenius',
  user: process.env.DB_USER || 'edugenius_user',
  password: process.env.DB_PASSWORD || 'Joy',
});

// Test connection once at startup
async function connectPostgres() {
  try {
    const res = await pool.query('SELECT NOW()');
    logger.info('✅ PostgreSQL connected:', res.rows[0]);
  } catch (err) {
    logger.error('❌ PostgreSQL connection error:', err);
    throw err;
  }
}

module.exports = {
  pool,
  connectPostgres
};