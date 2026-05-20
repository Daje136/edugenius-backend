'use strict';
const Question    = require('../models/mongo/Question');
const ExamSession = require('../models/postgres/ExamSession');
const AppError    = require('../utils/AppError');
const pool        = require('../config/postgres');
const { cacheGet, cacheSet, cacheDel } = require('../utils/cache');
const logger      = require('../utils/logger');

const CACHE_TTL      = 60 * 10; // 10 minutes
const PASS_THRESHOLD = 0.5;     // 50%

function calculateXP(score, total, timeSpent) {
  return Math.round((score / 100) * total * 10);
}

function detectWeakTopics(gradedAnswers, qMap) {
  const topicStats = {};
  for (const a of gradedAnswers) {
    const q = qMap[a.questionId];
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

// ── GET /api/exams/questions ─────────────────────────────────────────────────
exports.getQuestions = async (req, res) => {
  const {
    examType, subject, topic, year,
    count = 40, difficulty, type = 'MCQ',
  } = req.query;

  if (!examType || !subject) throw new AppError('examType and subject are required', 400);

  const cacheKey = `questions:${examType}:${subject}:${topic || 'all'}:${year || 'all'}:${count}:${difficulty || 'all'}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached, fromCache: true });

  // Build filter — all handled inside Question.find() with SQL
   const filter = { examType, subject };
if (topic && topic !== 'undefined')           filter.topic      = topic;
if (year && year !== 'undefined')             filter.year       = parseInt(year);
if (difficulty && difficulty !== 'undefined') filter.difficulty = parseInt(difficulty);
if (type && type !== 'all' && type !== 'undefined') filter.type = type;

  const questions = await Question.find(filter, {
    limit:   Math.min(parseInt(count), 60),
    exclude: ['worked_solution', 'common_mistakes'], // hide during exam
  });

  if (!questions.length) throw new AppError('No questions found for the selected criteria', 404);

  // Shuffle
  const shuffled = questions.sort(() => Math.random() - 0.5);

  await cacheSet(cacheKey, shuffled, CACHE_TTL);
  res.json({ success: true, count: shuffled.length, data: shuffled });
};

// ── POST /api/exams/start ────────────────────────────────────────────────────
exports.startSession = async (req, res) => {
  const { examType, subject, topic, year, questionIds, timeAllottedSeconds = 3600 } = req.body;

  const session = await ExamSession.create({
    userId:             req.user.id,
    examType,
    subject,
    topic:              topic || null,
    year:               year  || null,
    totalQuestions:     questionIds.length,
    timeAllottedSeconds,
    status:             'in_progress',
  });

  logger.info(`Exam session started: ${session.id} by user ${req.user.id}`);
  res.status(201).json({ success: true, sessionId: session.id, startedAt: session.createdAt });
};

// ── POST /api/exams/submit ───────────────────────────────────────────────────
exports.submitExam = async (req, res) => {
  const { sessionId, answers, timeSpentSeconds } = req.body;

  const session = await ExamSession.findOne({ where: { id: sessionId, userId: req.user.id } });
  if (!session)                         throw new AppError('Exam session not found', 404);
  if (session.status !== 'in_progress') throw new AppError('Session already submitted', 409);

  // Fetch correct answers for all submitted question IDs
  const questionIds = answers.map(a => a.questionId);
  const questions   = await Question.find({ _id: { $in: questionIds } });

  const qMap = {};
  questions.forEach(q => { qMap[String(q._id)] = q; });

  let correct = 0;
  const gradedAnswers = answers.map(a => {
    const q         = qMap[String(a.questionId)];
    const isCorrect = q && a.selected !== null && a.selected === q.answerIndex;
    if (isCorrect) correct++;

    // Update question stats asynchronously — fire and forget
    if (q) Question.incrementStats(a.questionId, isCorrect).catch(() => {});

    return { questionId: a.questionId, selected: a.selected, correct: isCorrect };
  });

  const score      = session.totalQuestions ? (correct / session.totalQuestions) * 100 : 0;
  const weakTopics = detectWeakTopics(gradedAnswers, qMap);
  const xpEarned   = calculateXP(score, session.totalQuestions, timeSpentSeconds);

  // Persist session results (Sequelize model — .save() is fine)
 await pool.query(
    `UPDATE exam_sessions SET
       answered             = $1,
       correct              = $2,
       score                = $3,
       time_spent_seconds   = $4,
       status               = 'submitted',
       answers_json         = $5::jsonb,
       weak_topics_detected = $6::text[],
       xp_earned            = $7,
       submitted_at         = NOW()
     WHERE id = $8`,
    [
      answers.length,
      correct,
      parseFloat(score.toFixed(2)),
      timeSpentSeconds,
      JSON.stringify(gradedAnswers),
      weakTopics,
      xpEarned,
      sessionId,
    ]
  );

  // Award XP to user using raw SQL
  await pool.query(
    `UPDATE users 
     SET xp_points = xp_points + $1,
         xp_level  = FLOOR((xp_points + $1) / 500) + 1
     WHERE id = $2`,
    [xpEarned, req.user.id]
  );

  await cacheDel(`leaderboard:${req.user.schoolId}`);
  logger.info(`Exam submitted: ${sessionId} | score ${score.toFixed(1)}% | XP +${xpEarned}`);

  // Return full questions with solutions for post-exam review
  const questionsWithSolutions = await Question.find({ _id: { $in: questionIds } });

  res.json({
    success:      true,
    sessionId,
    score:        parseFloat(score.toFixed(2)),
    correct,
    total:        session.total_questions,
    percentage:   parseFloat(score.toFixed(2)),
    passed:       score >= PASS_THRESHOLD * 100,
    xpEarned,
    weakTopics,
    questions:    questionsWithSolutions,
    gradedAnswers,
  });
};

// ── GET /api/exams/sessions ──────────────────────────────────────────────────
exports.getSessions = async (req, res) => {
  const { page = 1, limit = 20, examType, subject } = req.query;

  const where = { userId: req.user.id, status: 'submitted' };
  if (examType) where.examType = examType;
  if (subject)  where.subject  = subject;

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
};

// ── GET /api/exams/sessions/:id ──────────────────────────────────────────────
exports.getSession = async (req, res) => {
  const session = await ExamSession.findOne({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!session) throw new AppError('Session not found', 404);

  const questionIds = (session.answersJson || []).map(a => a.questionId);
  const questions   = await Question.find({ _id: { $in: questionIds } });

  res.json({ success: true, data: { session, questions } });
};

// ── GET /api/exams/leaderboard ───────────────────────────────────────────────
exports.getLeaderboard = async (req, res) => {
  const { examType, subject, limit = 20 } = req.query;
  const schoolId = req.user.schoolId;

  const cacheKey = `leaderboard:${schoolId || 'global'}:${examType || 'all'}:${subject || 'all'}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const { sequelize: sq } = require('../config/postgres');
  const { QueryTypes }    = require('sequelize');

  const schoolFilter = schoolId ? `AND u."schoolId" = '${schoolId}'` : '';
  const examFilter   = examType  ? `AND es."examType" = '${examType}'` : '';
  const subFilter    = subject   ? `AND es.subject ILIKE '%${subject}%'` : '';

  const rows = await sq.query(`
    SELECT
      u.id, u."firstName", u."lastName", u."xpLevel",
      ROUND(AVG(es.score)::numeric, 1) AS "avgScore",
      COUNT(es.id)::int                AS "sessionCount",
      MAX(es.score)                    AS "bestScore",
      u."streakDays"
    FROM exam_sessions es
    JOIN users u ON u.id = es."userId"
    WHERE es.status = 'submitted'
      ${schoolFilter} ${examFilter} ${subFilter}
    GROUP BY u.id, u."firstName", u."lastName", u."xpLevel", u."streakDays"
    ORDER BY "avgScore" DESC
    LIMIT ${parseInt(limit)}
  `, { type: QueryTypes.SELECT });

  await cacheSet(cacheKey, rows, 300);
  res.json({ success: true, data: rows });
};