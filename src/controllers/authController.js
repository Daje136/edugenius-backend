'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/postgres');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { AppError } = require('../middleware/errorHandler');

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

async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
}

async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
}

exports.register = async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  const existing = await getUserByEmail(email);
  if (existing) throw new AppError('Email already exists', 409);
  const hashedPassword = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role`,
    [firstName, lastName, email, hashedPassword, role || 'student']
  );
  const user = rows[0];
  emailService.sendWelcome(user).catch(err => logger.warn('Welcome email failed:', err));
  logger.info(`New user registered: ${email}`);
  res.json({ success: true, accessToken: signAccess(user.id), refreshToken: signRefresh(user.id), user });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await getUserByEmail(email);
  if (!user) throw new AppError('Invalid email or password', 401);
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError('Invalid email or password', 401);
  if (user.is_active === false) throw new AppError('Account is disabled', 403);
  const refreshToken = signRefresh(user.id);
  await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);
  logger.info(`User logged in: ${email}`);
  res.json({ success: true, accessToken: signAccess(user.id), refreshToken, user: { id: user.id, email: user.email, role: user.role } });
};

exports.getMe = async (req, res) => {
  const user = await getUserById(req.user.id);
  res.json({ success: true, user });
};

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
    'SELECT * FROM users WHERE id = $1 AND refresh_token = $2',
    [payload.id, refreshToken]
  );
  if (!rows[0]) throw new AppError('Refresh token revoked', 401);
  const newRefresh = signRefresh(payload.id);
  await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newRefresh, payload.id]);
  res.json({ success: true, accessToken: signAccess(payload.id), refreshToken: newRefresh });
};

exports.logout = async (req, res) => {
  await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
  logger.info(`User logged out: ${req.user.id}`);
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await getUserByEmail(email);
  if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent' });
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query(
    'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
    [tokenHash, expiresAt, user.id]
  );
  emailService.sendPasswordReset(user, token).catch(err => logger.warn('Reset email failed:', err));
  res.json({ success: true, message: 'If that email exists, a reset link was sent' });
};

exports.resetPassword = async (req, res) => {
  const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
    [tokenHash]
  );
  const user = rows[0];
  if (!user) throw new AppError('Token is invalid or has expired', 400);
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  await pool.query(
    `UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2`,
    [hashedPassword, user.id]
  );
  logger.info(`Password reset for user: ${user.email}`);
  res.json({ success: true, message: 'Password reset successful' });
};
