'use strict';
require("dotenv").config();
require('express-async-errors');

const express           = require('express');
const cors              = require('cors');
const helmet            = require('helmet');
const morgan            = require('morgan');
const compression       = require('compression');
const mongoSanitize     = require('express-mongo-sanitize');
const rateLimit         = require('express-rate-limit');

const pool                = require('./config/postgres');
const { connectRedis }    = require('./config/redis');
const logger              = require('./utils/logger');
const errorHandler        = require('./middleware/errorHandler');

// ─── Route imports ─────────────────────────────────────────
const authRoutes          = require('./routes/auth');
const userRoutes          = require('./routes/users');
const examRoutes          = require('./routes/exams');
const questionRoutes      = require('./routes/questions');
const aiRoutes            = require('./routes/ai');
const assignmentRoutes    = require('./routes/assignments');
const analyticsRoutes     = require('./routes/analytics');
const paymentRoutes       = require('./routes/payments');
const libraryRoutes       = require('./routes/library');
const adminRoutes         = require('./routes/admin');
const goalRoutes          = require('./routes/goals');
const notificationRoutes  = require('./routes/notifications');

const app = express();

// ─── Trust proxy (for Nginx / cloud load balancers) ────────
app.set('trust proxy', 1);

// ─── Security middleware ────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'none'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      connectSrc:  ["'self'", "http://127.0.0.1:5000", "http://localhost:5000", process.env.FRONTEND_URL].filter(Boolean),
      imgSrc:      ["'self'", "data:"],
      fontSrc:     ["'self'"],
    },
  },
}));
app.use(mongoSanitize());
app.use(compression());

// ─── CORS ──────────────────────────────────────────────────
const corsOptions = {
  origin: [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-tag'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ─── Request parsing ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}

// ─── Global rate limiter ───────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', globalLimiter);

// ─── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:      'ok',
    service:     'EduGenius API',
    version:     '2.0.0',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── Routes ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/exams',         examRoutes);
app.use('/api/questions',     questionRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/assignments',   assignmentRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/library',       libraryRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/goals',         goalRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── 404 handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Global error handler ──────────────────────────────────
app.use(errorHandler);

// ─── Boot sequence ─────────────────────────────────────────
async function boot() {
  try {
    // Try PostgreSQL but don't crash if it fails
    try {
      await pool.query('SELECT 1');
      logger.info('✅ PostgreSQL connected');
    } catch (dbErr) {
      logger.warn('⚠️  PostgreSQL not connected (check PG env vars):', dbErr.message);
    }

    // Try Redis but don't crash if it fails
    try {
      await connectRedis();
    } catch (redisErr) {
      logger.warn('⚠️  Redis not connected:', redisErr.message);
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`🚀 EduGenius API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Boot failed:', err);
    process.exit(1);
  }
}

boot();

module.exports = app; // for testing