'use strict';
const AppError = require('../utils/AppError');
const pool     = require('../config/postgres');
const { cacheGet, cacheSet, cacheDel } = require('../utils/cache');
const logger   = require('../utils/logger');

const CACHE_TTL      = 60 * 10; // 10 minutes
const PASS_THRESHOLD = 50;      // 50%

function calculateXP(score, total) {
  return Math.round((score / 100) * total * 10);
}

function detectWeakTopics(gradedAnswers, questions) {
  const topicStats = {};
  for (const a of gradedAnswers) {
    const q = questions.find(q => String(q.id) === String(a.questionId));
    if (!q) continue;
    const t = q.topic || 'General';
    if (!topicStats[t]) topicStats[t] = { correct: 0, total: 0 };
    topicStats[t].total++;
    if (a.correct) topicStats[t].correct++;
  }
  return Object.entries(topicStats)
    .filter(([, s]) => s.total > 0 && s.correct / s.total < 0.5)
    .map(([topic]) => topic);
}

// ── GET /api/exams/questions ──────────────────────────────────────────────────
exports.getQuestions = async (req, res) => {
  const {
    examType, subject, topic, year,
    count = 40, difficulty,
  } = req.query;

  if (!examType || !subject) throw new AppError('examType and subject are required', 400);

  const cacheKey = `questions:${examType}:${subject}:${topic||'all'}:${year||'all'}:${count}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached, fromCache: true });

  // Build dynamic query
  const conditions = ['exam_type = $1', 'subject = $2'];
  const values     = [examType, subject];
  let   idx        = 3;

  if (topic && topic !== 'undefined') {
    conditions.push(`topic = $${idx++}`);
    values.push(topic);
  }
  if (difficulty && difficulty !== 'undefined') {
    conditions.push(`difficulty = $${idx++}`);
    values.push(parseInt(difficulty));
  }

  const limit = Math.min(parseInt(count) || 40, 60);
  values.push(limit);

  const { rows } = await pool.query(
    `SELECT id, subject, question, answer, exam_type, topic, difficulty
     FROM questions
     WHERE ${conditions.join(' AND ')}
     ORDER BY RANDOM()
     LIMIT $${idx}`,
    values
  );

  if (!rows.length) throw new AppError('No questions found for the selected criteria. Please try different filters.', 404);

  // Format for frontend
  const formatted = rows.map(q => ({
    id:          q.id,
    body:        q.question,
    subject:     q.subject,
    topic:       q.topic,
    examType:    q.exam_type,
    difficulty:  q.difficulty,
    // Since our questions table stores answer as text, create simple format
    options:     null,  // text-based questions
    answer:      q.answer,
    type:        'text',
  }));

  await cacheSet(cacheKey, formatted, CACHE_TTL);
  res.json({ success: true, count: formatted.length, data: formatted });
};

// ── POST /api/exams/start ─────────────────────────────────────────────────────
exports.startSession = async (req, res) => {
  const { examType, subject, topic, questionIds = [], timeAllottedSeconds = 3600 } = req.body;

  if (!examType || !subject) throw new AppError('examType and subject are required', 400);

  // Create exam session in DB
  const { rows } = await pool.query(
    `INSERT INTO exam_sessions 
       (user_id, exam_type, subject, topic, total_questions, time_allotted_seconds, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', NOW())
     RETURNING id, created_at`,
    [req.user.id, examType, subject, topic || null, questionIds.length || 40, timeAllottedSeconds]
  );

  const session = rows[0];
  logger.info(`Exam session started: ${session.id} by user ${req.user.id}`);

  res.status(201).json({
    success:   true,
    sessionId: session.id,
    startedAt: session.created_at,
  });
};

// ── POST /api/exams/submit ────────────────────────────────────────────────────
exports.submitExam = async (req, res) => {
  const { sessionId, answers = [], timeSpentSeconds = 0 } = req.body;

  // Get session
  const { rows: sessionRows } = await pool.query(
    'SELECT * FROM exam_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, req.user.id]
  );
  const session = sessionRows[0];
  if (!session)                          throw new AppError('Exam session not found', 404);
  if (session.status !== 'in_progress')  throw new AppError('Session already submitted', 409);

  // Get questions answered
  const questionIds = answers.map(a => a.questionId).filter(Boolean);
  let questions = [];

  if (questionIds.length) {
    const { rows: qRows } = await pool.query(
      `SELECT id, question, answer, topic FROM questions WHERE id = ANY($1::int[])`,
      [questionIds]
    );
    questions = qRows;
  }

  // Grade answers
  let correct = 0;
  const gradedAnswers = answers.map(a => {
    // For text-based questions we can't auto-grade, so mark all as attempted
    const isCorrect = false; // Will be manually reviewed or AI-graded
    return { questionId: a.questionId, selected: a.selected, correct: isCorrect };
  });

  const total      = session.total_questions || answers.length;
  const score      = total ? (correct / total) * 100 : 0;
  const weakTopics = detectWeakTopics(gradedAnswers, questions);
  const xpEarned   = calculateXP(score, total);

  // Update session
  await pool.query(
    `UPDATE exam_sessions SET
       answered            = $1,
       correct             = $2,
       score               = $3,
       time_spent_seconds  = $4,
       status              = 'submitted',
       weak_topics         = $5,
       xp_earned           = $6,
       submitted_at        = NOW()
     WHERE id = $7`,
    [answers.length, correct, parseFloat(score.toFixed(2)), timeSpentSeconds,
     weakTopics, xpEarned, sessionId]
  );

  logger.info(`Exam submitted: ${sessionId} | score ${score.toFixed(1)}%`);

  res.json({
    success:    true,
    sessionId,
    score:      parseFloat(score.toFixed(2)),
    correct,
    total,
    percentage: parseFloat(score.toFixed(2)),
    passed:     score >= PASS_THRESHOLD,
    xpEarned,
    weakTopics,
    gradedAnswers,
  });
};

// ── GET /api/exams/sessions ───────────────────────────────────────────────────
exports.getSessions = async (req, res) => {
  const { page = 1, limit = 20, examType, subject } = req.query;

  const conditions = ['user_id = $1', "status = 'submitted'"];
  const values     = [req.user.id];
  let   idx        = 2;

  if (examType) { conditions.push(`exam_type = $${idx++}`); values.push(examType); }
  if (subject)  { conditions.push(`subject = $${idx++}`);   values.push(subject); }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  values.push(parseInt(limit));
  values.push(offset);

  const { rows } = await pool.query(
    `SELECT * FROM exam_sessions
     WHERE ${conditions.join(' AND ')}
     ORDER BY submitted_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    values
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM exam_sessions WHERE ${conditions.slice(0, -2).join(' AND ')}`,
    values.slice(0, -2)
  );

  res.json({
    success: true,
    total:   parseInt(countRows[0]?.count || 0),
    page:    parseInt(page),
    data:    rows,
  });
};

// ── GET /api/exams/sessions/:id ───────────────────────────────────────────────
exports.getSession = async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM exam_sessions WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) throw new AppError('Session not found', 404);
  res.json({ success: true, data: rows[0] });
};

// ── GET /api/exams/leaderboard ────────────────────────────────────────────────
exports.getLeaderboard = async (req, res) => {
  const { examType, subject, limit = 20 } = req.query;

  const cacheKey = `leaderboard:${examType||'all'}:${subject||'all'}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const conditions = ["es.status = 'submitted'"];
  const values     = [];
  let   idx        = 1;

  if (examType) { conditions.push(`es.exam_type = $${idx++}`); values.push(examType); }
  if (subject)  { conditions.push(`es.subject = $${idx++}`);   values.push(subject); }

  values.push(parseInt(limit));

  const { rows } = await pool.query(
    `SELECT
       u.id,
       u.first_name,
       u.last_name,
       ROUND(AVG(es.score)::numeric, 1) AS avg_score,
       COUNT(es.id)::int                AS session_count,
       MAX(es.score)                    AS best_score
     FROM exam_sessions es
     JOIN users u ON u.id = es.user_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY u.id, u.first_name, u.last_name
     ORDER BY avg_score DESC
     LIMIT $${idx}`,
    values
  );

  await cacheSet(cacheKey, rows, 300);
  res.json({ success: true, data: rows });
};