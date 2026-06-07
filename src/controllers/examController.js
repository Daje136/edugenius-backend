'use strict';
const { Op }      = require('sequelize');
const ExamSession  = require('../models/postgres/ExamSession');
const PgQuestion   = require('../models/postgres/Question');
const { cacheGet, cacheSet } = require('../utils/cache');
const logger       = require('../utils/logger');
const AppError     = require('../utils/AppError');

const CACHE_TTL      = 600;
const PASS_THRESHOLD = 50;

// Default time per exam type (seconds)
const EXAM_TIME_MAP = {
  JAMB:  7200,   // 2 hours
  WAEC:  10800,  // 3 hours
  NECO:  10800,  // 3 hours
  IELTS: 3600,   // 1 hour (Reading/Writing/Listening combined)
  GCSE:  5400,   // 1.5 hours
};

// Safe fields returned to client — answerIndex is deliberately excluded
const SAFE_QUESTION_FIELDS = [
  'id', 'body', 'options', 'subject', 'topic',
  'examType', 'difficulty', 'year', 'type',
];

function safeQuestion(q) {
  const out = {};
  for (const f of SAFE_QUESTION_FIELDS) out[f] = q[f];
  return out;
}

function normaliseExamType(raw) {
  if (!raw) return null;
  return raw.trim().toUpperCase()
    .replace('UK_GCSE', 'GCSE')
    .replace('A_LEVEL', 'A-Level');
}

function calculateXP(score, total) {
  return Math.round((score / 100) * total * 10);
}

function detectWeakTopics(gradedAnswers, questions) {
  const stats = {};
  for (const a of gradedAnswers) {
    const q = questions.find(q => String(q.id) === String(a.questionId));
    if (!q) continue;
    const t = q.topic || 'General';
    if (!stats[t]) stats[t] = { correct: 0, total: 0 };
    stats[t].total++;
    if (a.correct) stats[t].correct++;
  }
  return Object.entries(stats)
    .filter(([, s]) => s.total > 0 && s.correct / s.total < 0.5)
    .map(([topic]) => topic);
}

function buildQuestionWhere({ examType, subject, topic, year, difficulty }) {
  const et = normaliseExamType(examType);
  if (!et || !subject) return null;
  const where = {
    examType:   { [Op.iLike]: et },
    subject:    { [Op.iLike]: subject.trim() },
    isApproved: true,
  };
  if (topic)      where.topic      = { [Op.iLike]: '%' + topic.trim() + '%' };
  if (year)       where.year       = parseInt(year);
  if (difficulty) where.difficulty = parseInt(difficulty);
  return where;
}

// ── GET /api/questions ────────────────────────────────────────────────────────
exports.getQuestions = async (req, res, next) => {
  try {
    const { examType, subject, topic, year, count = 40, difficulty } = req.query;
    if (!examType || !subject)
      return next(new AppError('examType and subject are required', 400));

    const et       = normaliseExamType(examType);
    const cacheKey = `q:${et}:${subject}:${topic||'all'}:${year||'all'}:${count}:${difficulty||'all'}`;
    const cached   = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    const where = buildQuestionWhere({ examType, subject, topic, year, difficulty });
    const limit = Math.min(parseInt(count) || 40, 60);
    const pool  = await PgQuestion.findAll({ where, limit: limit * 3 });
    const rows  = pool.sort(() => Math.random() - 0.5).slice(0, limit);

    if (!rows.length)
      return next(new AppError(
        `No approved questions found for ${et} — ${subject}. Try different filters.`, 404
      ));

    // Strip answerIndex before sending to client
    const safe = rows.map(safeQuestion);
    await cacheSet(cacheKey, safe, CACHE_TTL);
    res.json({ success: true, count: safe.length, data: safe });
  } catch (err) { next(err); }
};

// ── POST /api/exam/start ──────────────────────────────────────────────────────
exports.startSession = async (req, res, next) => {
  try {
    let { examType, subject, topic, count = 40, timeAllottedSeconds, year, difficulty } = req.body;
    if (!examType || !subject)
      return next(new AppError('examType and subject are required', 400));

    const et = normaliseExamType(examType);

    // Use per-exam default time if caller didn't specify
    if (!timeAllottedSeconds) timeAllottedSeconds = EXAM_TIME_MAP[et] || 3600;

    const where = buildQuestionWhere({ examType, subject, topic, year, difficulty });
    const limit = Math.min(parseInt(count), 60);
    const pool  = await PgQuestion.findAll({ where, limit: limit * 3 });
    const questions = pool.sort(() => Math.random() - 0.5).slice(0, limit);

    if (!questions.length)
      return next(new AppError(
        `No approved questions found for ${et} — ${subject}. Try different filters.`, 404
      ));

    const session = await ExamSession.create({
      userId:             req.user.id,
      examType:           et,
      subject:            subject.trim(),
      topic:              topic || null,
      totalQuestions:     questions.length,
      timeAllottedSeconds: parseInt(timeAllottedSeconds),
      status:             'in_progress',
      answersJson:        questions.map(q => ({ questionId: q.id, selected: null, correct: null })),
    });

    logger.info(`Session started: ${session.id} | ${et} ${subject} | user ${req.user.id}`);

    res.status(201).json({
      success:             true,
      sessionId:           session.id,
      startedAt:           session.createdAt,
      timeAllottedSeconds: session.timeAllottedSeconds,
      totalQuestions:      session.totalQuestions,
      questions:           questions.map(safeQuestion),   // answerIndex excluded
    });
  } catch (err) { next(err); }
};

// ── POST /api/exam/submit ─────────────────────────────────────────────────────
exports.submitExam = async (req, res, next) => {
  try {
    const { sessionId, answers = [], timeSpentSeconds = 0 } = req.body;

    const session = await ExamSession.findOne({
      where: { id: sessionId, userId: req.user.id },
    });
    if (!session)
      return next(new AppError('Exam session not found', 404));
    if (session.status !== 'in_progress')
      return next(new AppError('Session already submitted', 409));

    const questionIds = answers.map(a => a.questionId).filter(Boolean);
    const questions   = questionIds.length
      ? await PgQuestion.findAll({ where: { id: { [Op.in]: questionIds } } })
      : [];

    let correct = 0;
    const gradedAnswers = answers.map(a => {
      const q         = questions.find(q => String(q.id) === String(a.questionId));
      const isCorrect = q && a.selected !== null && a.selected !== undefined
        ? parseInt(a.selected) === q.answerIndex
        : false;
      if (isCorrect) correct++;
      return {
        questionId:    a.questionId,
        selected:      a.selected,
        correct:       isCorrect,
        correctAnswer: q ? q.answerIndex : null,
        timeTakenMs:   a.timeTakenMs || 0,
      };
    });

    const total      = session.totalQuestions || answers.length;
    const score      = total ? (correct / total) * 100 : 0;
    const weakTopics = detectWeakTopics(gradedAnswers, questions);
    const xpEarned   = calculateXP(score, total);

    await session.update({
      answered:           answers.length,
      correct,
      score:              parseFloat(score.toFixed(2)),
      timeSpentSeconds:   parseInt(timeSpentSeconds),
      status:             'submitted',
      answersJson:        gradedAnswers,
      weakTopicsDetected: weakTopics,
      xpEarned,
      submittedAt:        new Date(),
    });

    logger.info(`Exam submitted: ${sessionId} | score ${score.toFixed(1)}% | user ${req.user.id}`);

    res.json({
      success:       true,
      sessionId,
      score:         parseFloat(score.toFixed(2)),
      correct,
      total,
      percentage:    parseFloat(score.toFixed(2)),
      passed:        score >= PASS_THRESHOLD,
      xpEarned,
      weakTopics,
      gradedAnswers,
    });
  } catch (err) { next(err); }
};

// ── GET /api/exam/sessions ────────────────────────────────────────────────────
exports.getSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, examType, subject } = req.query;
    const where = { userId: req.user.id, status: 'submitted' };
    if (examType) where.examType = { [Op.iLike]: normaliseExamType(examType) };
    if (subject)  where.subject  = { [Op.iLike]: '%' + subject + '%' };

    const { count, rows } = await ExamSession.findAndCountAll({
      where,
      order:  [['submittedAt', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      success: true,
      total:   count,
      page:    parseInt(page),
      pages:   Math.ceil(count / parseInt(limit)),
      data:    rows,
    });
  } catch (err) { next(err); }
};

// ── GET /api/exam/sessions/:id ────────────────────────────────────────────────
exports.getSession = async (req, res, next) => {
  try {
    const session = await ExamSession.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!session) return next(new AppError('Session not found', 404));

    const questionIds = (session.answersJson || []).map(a => a.questionId).filter(Boolean);
    const questions   = questionIds.length
      ? await PgQuestion.findAll({ where: { id: { [Op.in]: questionIds } } })
      : [];

    res.json({ success: true, data: { session, questions } });
  } catch (err) { next(err); }
};

// ── GET /api/exam/leaderboard ─────────────────────────────────────────────────
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { examType, subject, limit = 20 } = req.query;
    const et       = normaliseExamType(examType);
    const cacheKey = `leaderboard:${et||'all'}:${subject||'all'}`;
    const cached   = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const { sequelize: sq } = require('../config/postgres');
    const { QueryTypes }    = require('sequelize');

    const examFilter = et      ? `AND es.exam_type ILIKE ${sq.escape(et)}`      : '';
    const subFilter  = subject ? `AND es.subject ILIKE ${sq.escape('%'+subject+'%')}` : '';

    const rows = await sq.query(
      `SELECT
         u.id,
         u.first_name,
         u.last_name,
         ROUND(AVG(es.score)::numeric, 1)  AS avg_score,
         COUNT(es.id)::int                 AS session_count,
         MAX(es.score)                     AS best_score
       FROM exam_sessions es
       JOIN users u ON u.id = es.user_id
       WHERE es.status = 'submitted'
         ${examFilter}
         ${subFilter}
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY avg_score DESC
       LIMIT ${parseInt(limit)}`,
      { type: QueryTypes.SELECT }
    );

    await cacheSet(cacheKey, rows, 300);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
