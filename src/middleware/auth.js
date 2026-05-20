'use strict';

const jwt = require('jsonwebtoken');
const pool = require('../config/postgres');
const { AppError } = require('./errorHandler');

// ─── Verify JWT ─────────────────────────────────────────────
async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Please log in.', 401));
  }

  const token = header.split(' ')[1];

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401));
  }

  // Fetch user from PostgreSQL
  const { rows } = await pool.query(
    `SELECT id, email, role, is_active
     FROM users
     WHERE id = $1`,
    [decoded.id]
  );

  const user = rows[0];

  if (!user) {
    return next(new AppError('User no longer exists', 401));
  }

  if (user.is_active === false) {
    return next(
      new AppError('Account is deactivated. Contact your school admin.', 403)
    );
  }

  req.user = user;
  next();
}

// ─── Role guards ────────────────────────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: ${roles.join(' or ')}`,
          403
        )
      );
    }

    next();
  };
}

const requireAdmin = requireRole('admin');
const requireTeacher = requireRole('admin', 'teacher');

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireTeacher
};