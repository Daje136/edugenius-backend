'use strict';
const { QueryTypes }  = require('sequelize');
const { sequelize }   = require('../config/postgres');
const ExamSession     = require('../models/postgres/ExamSession');
const { AppError }    = require('../middleware/errorHandler');
const { cacheSet, cacheGet } = require('../config/redis');

// ─── GET /api/analytics/dashboard ────────────────────────────
// Student personal dashboard stats
exports.studentDashboard = async (req, res) => {
  const userId   = req.user.id;
  const cacheKey = `analytics:student:${userId}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached, fromCache: true });

  const [overview, bySubject, trend, recentSessions] = await Promise.all([

    // Overall stats
    sequelize.query(`
      SELECT
        COUNT(*)::int                             AS "totalSessions",
        ROUND(AVG(score)::numeric, 1)             AS "avgScore",
        MAX(score)                                AS "bestScore",
        SUM(time_spent_seconds)::int              AS "totalTimeSeconds",
        SUM(correct)::int                         AS "totalCorrect",
        SUM(total_questions)::int                 AS "totalAttempted"
      FROM exam_sessions
      WHERE user_id = :userId AND status = 'submitted'
    `, { replacements: { userId }, type: QueryTypes.SELECT }),

    // Per-subject breakdown
    sequelize.query(`
      SELECT
        subject,
        COUNT(*)::int                             AS "sessions",
        ROUND(AVG(score)::numeric, 1)             AS "avgScore",
        MAX(score)                                AS "bestScore",
        SUM(correct)::int                         AS "totalCorrect",
        SUM(total_questions)::int                 AS "totalAttempted"
      FROM exam_sessions
      WHERE user_id = :userId AND status = 'submitted'
      GROUP BY subject
      ORDER BY "avgScore" DESC
    `, { replacements: { userId }, type: QueryTypes.SELECT }),

    // Score trend (last 12 weeks)
    sequelize.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('week', submitted_at), 'YYYY-MM-DD') AS week,
        ROUND(AVG(score)::numeric, 1)                           AS "avgScore",
        COUNT(*)::int                                           AS sessions
      FROM exam_sessions
      WHERE user_id = :userId
        AND status = 'submitted'
        AND submitted_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', submitted_at)
      ORDER BY week ASC
    `, { replacements: { userId }, type: QueryTypes.SELECT }),

    // Recent 5 sessions
    ExamSession.findAll({
      where: { user_id: userId, status: 'submitted' },
      order: [['submitted_at', 'DESC']],
      limit: 5,
    }),
  ]);

  const data = {
    overview:       overview[0],
    bySubject,
    trend,
    recentSessions,
    streak:         req.user.streak_days,
    xp:             req.user.xpPoints,
    xp_level:       req.user.xp_level,
  };

  await cacheSet(cacheKey, data, 180); // 3-minute cache
  res.json({ success: true, data });
};

// ─── GET /api/analytics/school ───────────────────────────────
// Admin/Teacher school-level analytics
exports.schoolAnalytics = async (req, res) => {
  const { school_id, exam_type, subject, classId } = req.query;
  const sId = school_id || req.user.school_id;
  if (!sId) throw new AppError('school_id is required', 400);

  const cacheKey = `analytics:school:${sId}:${exam_type||'all'}:${subject||'all'}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const examFilter    = exam_type ? `AND es.exam_type = '${exam_type}'` : '';
  const subjectFilter = subject   ? `AND es.subject ILIKE '%${subject}%'` : '';

  const [overview, topStudents, subjectBreakdown, weeklyActivity] = await Promise.all([

    sequelize.query(`
      SELECT
        COUNT(DISTINCT es.user_id)::int           AS "activeStudents",
        COUNT(es.id)::int                         AS "totalSessions",
        ROUND(AVG(es.score)::numeric, 1)          AS "avgScore",
        SUM(es.total_questions)::int              AS "totalQuestionsAttempted"
      FROM exam_sessions es
      JOIN users u ON u.id = es.user_id
      WHERE u.school_id = :sId AND es.status = 'submitted' ${examFilter} ${subjectFilter}
    `, { replacements: { sId }, type: QueryTypes.SELECT }),

    sequelize.query(`
      SELECT
        u.id, u.first_name, u.last_name, u.xp_level,
        ROUND(AVG(es.score)::numeric, 1) AS "avgScore",
        COUNT(es.id)::int                AS "sessions",
        u.streak_days
      FROM exam_sessions es
      JOIN users u ON u.id = es.user_id
      WHERE u.school_id = :sId AND es.status = 'submitted' ${examFilter}
      GROUP BY u.id, u.first_name, u.last_name, u.xp_level, u.streak_days
      ORDER BY "avgScore" DESC
      LIMIT 10
    `, { replacements: { sId }, type: QueryTypes.SELECT }),

    sequelize.query(`
      SELECT
        es.subject,
        ROUND(AVG(es.score)::numeric, 1)          AS "avgScore",
        COUNT(es.id)::int                         AS "sessions",
        COUNT(DISTINCT es.user_id)::int           AS "students",
        SUM(CASE WHEN es.score >= 50 THEN 1 ELSE 0 END)::int AS "passCount"
      FROM exam_sessions es
      JOIN users u ON u.id = es.user_id
      WHERE u.school_id = :sId AND es.status = 'submitted' ${examFilter}
      GROUP BY es.subject
      ORDER BY "avgScore" DESC
    `, { replacements: { sId }, type: QueryTypes.SELECT }),

    sequelize.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('week', es.submitted_at), 'YYYY-MM-DD') AS week,
        COUNT(es.id)::int AS sessions,
        COUNT(DISTINCT es.user_id)::int AS "activeStudents"
      FROM exam_sessions es
      JOIN users u ON u.id = es.user_id
      WHERE u.school_id = :sId
        AND es.submitted_at >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', es.submitted_at)
      ORDER BY week ASC
    `, { replacements: { sId }, type: QueryTypes.SELECT }),
  ]);

  const data = { overview: overview[0], topStudents, subjectBreakdown, weeklyActivity };
  await cacheSet(cacheKey, data, 300);
  res.json({ success: true, data });
};

// ─── GET /api/analytics/student/:id ─────────────────────────
// Teacher viewing a specific student
exports.studentProfile = async (req, res) => {
  const { id } = req.params;

  const [sessions, bySubject, weakTopics] = await Promise.all([
    ExamSession.findAll({
      where: { user_id: id, status: 'submitted' },
      order: [['submitted_at', 'DESC']],
      limit: 50,
    }),
    sequelize.query(`
      SELECT subject,
        ROUND(AVG(score)::numeric,1) AS "avgScore",
        COUNT(*)::int AS sessions
      FROM exam_sessions
      WHERE user_id = :id AND status = 'submitted'
      GROUP BY subject ORDER BY "avgScore" ASC
    `, { replacements: { id }, type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT UNNEST(weak_topics_detected) AS topic, COUNT(*)::int AS occurrences
      FROM exam_sessions
      WHERE user_id = :id AND status = 'submitted'
      GROUP BY topic
      ORDER BY occurrences DESC
      LIMIT 10
    `, { replacements: { id }, type: QueryTypes.SELECT }),
  ]);

  res.json({ success: true, data: { sessions, bySubject, weakTopics } });
};