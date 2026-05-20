'use strict';
const { Pool }      = require('pg');
const { Sequelize } = require('sequelize');

// ─── RAW POOL (used in authController, userController) ─────
const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'edugenius',
  user:     process.env.PG_USER     || 'edugenius_user',
  password: process.env.PG_PASSWORD || 'Joy',
  ssl:      process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ PostgreSQL pool connected'));
pool.on('error',   (err) => console.error('❌ PostgreSQL pool error:', err.message));

// ─── SEQUELIZE INSTANCE (used by all Sequelize models) ─────
const sequelize = new Sequelize({
  dialect:  'postgres',
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'edugenius',
  username: process.env.PG_USER     || 'edugenius_user',
  password: process.env.PG_PASSWORD || 'Joy',
  ssl:      process.env.PG_SSL === 'true',
  dialectOptions: process.env.PG_SSL === 'true'
    ? { ssl: { rejectUnauthorized: false } }
    : {},
  logging:  false,   // set to console.log to debug SQL queries
  define: {
    underscored:   false,
    freezeTableName: true,
  },
});

module.exports      = pool;           // default export → keeps all pool.query() calls working
module.exports.sequelize = sequelize; // named export  → fixes all Sequelize model .init() calls