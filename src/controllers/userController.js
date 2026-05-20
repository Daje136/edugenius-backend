'use strict';

const pool = require('../config/postgres');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// ─── PROFILE ───────────────────────────────────
exports.getProfile = async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, fullname, email, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json({ success: true, data: rows[0] });
};

exports.updateProfile = async (req, res) => {
  const { firstName, lastName, classLevel, examTarget, curriculum, avatarUrl } = req.body;
  const fullname = firstName && lastName ? `${firstName} ${lastName}` : undefined;

  const { rows } = await pool.query(
    `UPDATE users SET
       fullname      = COALESCE($1, fullname),
       class_level   = COALESCE($2, class_level),
       exam_target   = COALESCE($3, exam_target),
       curriculum    = COALESCE($4, curriculum),
       avatar_url    = COALESCE($5, avatar_url)
     WHERE id = $6
     RETURNING id, fullname, email, role`,
    [fullname, classLevel, examTarget, curriculum, avatarUrl, req.user.id]
  );
  res.json({ success: true, data: rows[0] });
};

exports.changePassword = async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError('Both passwords are required', 400);

  const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
  const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
  if (!isMatch) throw new AppError('Current password is incorrect', 401);

  const hashed = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
  res.json({ success: true, message: 'Password changed successfully' });
};

// ─── GOALS ─────────────────────────────────────
exports.createGoal = async (req, res) => {
  await pool.query('UPDATE study_goals SET is_active = false WHERE user_id = $1', [req.user.id]);
  const { rows } = await pool.query(
    `INSERT INTO study_goals (user_id, title, target_date, daily_minutes, is_active)
     VALUES ($1, $2, $3, $4, true) RETURNING *`,
    [req.user.id, req.body.title, req.body.targetDate, req.body.dailyMinutes]
  );
  res.status(201).json({ success: true, data: rows[0] });
};

exports.getMyGoal = async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM study_goals WHERE user_id = $1 AND is_active = true',
    [req.user.id]
  );
  res.json({ success: true, data: rows[0] || null });
};

exports.updateGoal = async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE study_goals SET title = COALESCE($1, title),
       target_date = COALESCE($2, target_date),
       daily_minutes = COALESCE($3, daily_minutes)
     WHERE id = $4 AND user_id = $5 RETURNING *`,
    [req.body.title, req.body.targetDate, req.body.dailyMinutes, req.params.id, req.user.id]
  );
  if (!rows[0]) throw new AppError('Goal not found', 404);
  res.json({ success: true, data: rows[0] });
};

// ─── NOTIFICATIONS ─────────────────────────────
exports.getNotifications = async (req, res) => {
  const { limit = 20, unreadOnly } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ${unreadOnly === 'true' ? 'AND read = false' : ''}
     ORDER BY created_at DESC LIMIT $2`,
    [req.user.id, parseInt(limit)]
  );
  res.json({ success: true, data: rows });
};

exports.markRead = async (req, res) => {
  await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [req.user.id]);
  res.json({ success: true, message: 'All notifications marked as read' });
};

// ─── ADMIN ─────────────────────────────────────
exports.listUsers = async (req, res) => {
  const { page = 1, limit = 30, role, isActive } = req.query;
  const conditions = [];
  const values = [];
  if (role) { conditions.push(`role = $${values.length + 1}`); values.push(role); }
  if (isActive !== undefined) { conditions.push(`is_active = $${values.length + 1}`); values.push(isActive === 'true'); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  values.push(parseInt(limit), offset);
  const { rows } = await pool.query(
    `SELECT id, fullname, email, role, is_active, created_at FROM users ${where}
     ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  res.json({ success: true, data: rows });
};

exports.updateUser = async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE users SET role = COALESCE($1, role), is_active = COALESCE($2, is_active)
     WHERE id = $3 RETURNING id, fullname, email, role, is_active`,
    [req.body.role, req.body.isActive, req.params.id]
  );
  if (!rows[0]) throw new AppError('User not found', 404);
  res.json({ success: true, data: rows[0] });
};

exports.deleteUser = async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE users SET is_active = false WHERE id = $1 RETURNING id',
    [req.params.id]
  );
  if (!rows[0]) throw new AppError('User not found', 404);
  res.json({ success: true, message: 'User deactivated' });
};

exports.sendAnnouncement = async (req, res) => {
  const { title, body, audience = 'all' } = req.body;
  const conditions = ['is_active = true'];
  if (audience === 'students') conditions.push(`role = 'student'`);
  if (audience === 'teachers') conditions.push(`role = 'teacher'`);
  const { rows: users } = await pool.query(
    `SELECT id FROM users WHERE ${conditions.join(' AND ')}`
  );
  const inserts = users.map(u =>
    pool.query(
      `INSERT INTO notifications (user_id, type, title, body) VALUES ($1, 'announcement', $2, $3)`,
      [u.id, title, body]
    )
  );
  await Promise.all(inserts);
  logger.info(`Announcement sent to ${users.length} users by ${req.user.id}`);
  res.json({ success: true, message: `Announcement sent to ${users.length} users` });
};

// ─── ASSIGNMENTS (stubs — expand when ready) ───
exports.createAssignment  = async (req, res) => res.status(501).json({ message: 'Not implemented' });
exports.getAssignments    = async (req, res) => res.status(501).json({ message: 'Not implemented' });
exports.getAssignment     = async (req, res) => res.status(501).json({ message: 'Not implemented' });
exports.submitAssignment  = async (req, res) => res.status(501).json({ message: 'Not implemented' });
exports.getSubmissions    = async (req, res) => res.status(501).json({ message: 'Not implemented' });
exports.gradeSubmission   = async (req, res) => res.status(501).json({ message: 'Not implemented' });

// ─── LIBRARY (stubs — expand when ready) ───────
exports.listResources     = async (req, res) => res.status(501).json({ message: 'Not implemented' });
exports.getResource       = async (req, res) => res.status(501).json({ message: 'Not implemented' });
exports.createResource    = async (req, res) => res.status(501).json({ message: 'Not implemented' });