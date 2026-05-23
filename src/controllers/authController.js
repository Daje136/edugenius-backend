'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/postgres');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { AppError } = require('../middleware/errorHandler');

// ── Token helpers ─────────────────────────────────────────────────────────────
function signAccess(userId) {
  return jwt.sign(
    { id: userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function signRefresh(userId) {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
}

// ── DB helpers ────────────────────────────────────────────────────────────────
// FIX #2 & #3: Select only safe columns — never SELECT * to avoid
// leaking password hash or refresh_token to the client.

async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, first_name, last_name, email, role, password, is_active,
            refresh_token, password_reset_token, password_reset_expires
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0];
}

async function getUserById(id) {
  const { rows } = await pool.query(
    `SELECT id, first_name, last_name, email, role
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0];
}

// ── Safe public shape ─────────────────────────────────────────────────────────
// Single place that defines what fields are safe to send to the client.
function publicUser(user) {
  return {
    id:        user.id,
    firstName: user.first_name,
    lastName:  user.last_name,
    email:     user.email,
    role:      user.role,
  };
}

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    // FIX #5: Joi already validated these fields — no manual checks needed.
    // FIX #1: role is NOT destructured from req.body — always hardcoded below.
    const { firstName, lastName, email, password, schoolId, classLevel, examTarget } = req.body;

    const existing = await getUserByEmail(email);
    if (existing) throw new AppError('Email already exists', 409);

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, role, school_id, class_level, exam_target)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, first_name, last_name, email, role`,
      // FIX #1: role hardcoded as 'student' — never trusted from client.
      [firstName, lastName, email, hashedPassword, 'student', schoolId || null, classLevel || null, examTarget || null]
    );

    const user = rows[0];

    try {
      const emailService = require('../services/emailService');
      await emailService.sendWelcome(user);
    } catch (emailErr) {
      logger.warn('Welcome email failed:', emailErr.message);
    }

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success:      true,
      accessToken:  signAccess(user.id),
      refreshToken: signRefresh(user.id),
      user:         publicUser(user),
    });

  } catch (err) {
    logger.error('Register error:', err.message);
    throw err;
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await getUserByEmail(email);

    // FIX: Compare against a dummy hash when user not found to prevent
    // timing-based user enumeration attacks.
    const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !isMatch) throw new AppError('Invalid email or password', 401);
    if (user.is_active === false) throw new AppError('Account is disabled', 403);

    const refreshToken = signRefresh(user.id);
    await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

    logger.info(`User logged in: ${email}`);

    res.json({
      success:      true,
      accessToken:  signAccess(user.id),
      refreshToken,
      user:         publicUser(user),
    });

  } catch (err) {
    logger.error('Login error:', err.message);
    throw err;
  }
};

// ── Get current user ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  // FIX #2: getUserById now selects only safe columns — no password/token leak.
  const user = await getUserById(req.user.id);
  res.json({ success: true, user });
};

// ── Refresh token ─────────────────────────────────────────────────────────────
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 400);

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (payload.type !== 'refresh') throw new AppError('Invalid token type', 401);

  const { rows } = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND refresh_token = $2',
    [payload.id, refreshToken]
  );
  if (!rows[0]) throw new AppError('Refresh token revoked', 401);

  const newRefresh = signRefresh(payload.id);
  await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newRefresh, payload.id]);

  res.json({
    success:      true,
    accessToken:  signAccess(payload.id),
    refreshToken: newRefresh,
  });
};

// ── Logout ────────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
  logger.info(`User logged out: ${req.user.id}`);
  res.json({ success: true, message: 'Logged out successfully' });
};

// ── Forgot password ───────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('email is required', 400);

  const user = await getUserByEmail(email);
  // Always return the same response — prevents email enumeration.
  if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent' });

  const token     = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query(
    'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
    [tokenHash, expiresAt, user.id]
  );

  try {
    const emailService = require('../services/emailService');
    await emailService.sendPasswordReset(user, token);
  } catch (emailErr) {
    logger.warn('Reset email failed:', emailErr.message);
  }

  res.json({ success: true, message: 'If that email exists, a reset link was sent' });
};

// ── Reset password ────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  // FIX #4: Validate new password before accepting it.
  const { password } = req.body;
  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }
  if (password.length > 72) {
    throw new AppError('Password must be under 72 characters', 400);
  }

  const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const { rows } = await pool.query(
    `SELECT id, email FROM users
     WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
    [tokenHash]
  );

  const user = rows[0];
  if (!user) throw new AppError('Token is invalid or has expired', 400);

  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.query(
    `UPDATE users
     SET password = $1, password_reset_token = NULL, password_reset_expires = NULL
     WHERE id = $2`,
    [hashedPassword, user.id]
  );

  logger.info(`Password reset for user: ${user.email}`);
  res.json({ success: true, message: 'Password reset successful' });
};