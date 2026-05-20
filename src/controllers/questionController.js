'use strict';
const Question       = require('../models/mongo/Question');
const { AppError }   = require('../middleware/errorHandler');
const { cacheSet, cacheGet, cacheDel } = require('../config/redis');
const { parse }      = require('csv-parse/sync');
const logger         = require('../utils/logger');

// ─── GET /api/questions ──────────────────────────────────────
exports.list = async (req, res) => {
  const {
    examType, subject, topic, year, type, difficulty,
    curriculum, approved, page = 1, limit = 20, search,
  } = req.query;

  const filter = {};
  if (examType)    filter.examType    = examType;
  if (subject)     filter.subject     = new RegExp(subject, 'i');
  if (topic)       filter.topic       = new RegExp(topic, 'i');
  if (year)        filter.year        = parseInt(year);
  if (type)        filter.type        = type;
  if (difficulty)  filter.difficulty  = parseInt(difficulty);
  if (curriculum)  filter.curriculum  = curriculum;
  if (approved !== undefined) filter.approved = approved === 'true';
  if (search)      filter.$text       = { $search: search };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [questions, total] = await Promise.all([
    Question.find(filter)
      .sort({ year: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Question.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    page:  parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data:  questions,
  });
};

// ─── GET /api/questions/:id ──────────────────────────────────
exports.getOne = async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (!q) throw new AppError('Question not found', 404);
  res.json({ success: true, data: q });
};

// ─── POST /api/questions ─────────────────────────────────────
exports.create = async (req, res) => {
  const data = { ...req.body, uploadedBy: req.user.id };

  // Auto-approve if uploaded by admin
  if (req.user.role === 'admin') data.approved = true;

  const q = await Question.create(data);
  await cacheDel(`questions:${q.examType}:${q.subject}`);

  logger.info(`Question created: ${q._id} by ${req.user.email}`);
  res.status(201).json({ success: true, data: q });
};

// ─── PUT /api/questions/:id ──────────────────────────────────
exports.update = async (req, res) => {
  const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!q) throw new AppError('Question not found', 404);
  res.json({ success: true, data: q });
};

// ─── DELETE /api/questions/:id ───────────────────────────────
exports.remove = async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Question deleted' });
};

// ─── PATCH /api/questions/:id/approve ───────────────────────
exports.approve = async (req, res) => {
  const q = await Question.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
  if (!q) throw new AppError('Question not found', 404);
  res.json({ success: true, data: q });
};

// ─── POST /api/questions/bulk-upload ────────────────────────
// Accepts JSON array or CSV file
exports.bulkUpload = async (req, res) => {
  let questions = [];

  // JSON body upload
  if (req.body.questions && Array.isArray(req.body.questions)) {
    questions = req.body.questions;
  }
  // CSV file upload
  else if (req.file) {
    const csvText = req.file.buffer.toString('utf8');
    const rows    = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

    questions = rows.map(r => ({
      examType:        r.exam_type   || r.examType,
      subject:         r.subject,
      topic:           r.topic,
      year:            r.year ? parseInt(r.year) : undefined,
      type:            r.type || 'MCQ',
      body:            r.body || r.question,
      options:         r.options ? r.options.split('|').map(t => ({ text: t.trim(), isCorrect: false })) : [],
      answerIndex:     r.answer_index !== undefined ? parseInt(r.answer_index) : undefined,
      workedSolution:  r.worked_solution || r.solution,
      difficulty:      r.difficulty ? parseInt(r.difficulty) : 3,
      curriculum:      r.curriculum || 'NG',
      tags:            r.tags ? r.tags.split(',').map(t => t.trim()) : [],
    }));
  } else {
    throw new AppError('Provide a JSON array in body.questions or upload a CSV file', 400);
  }

  if (!questions.length) throw new AppError('No questions provided', 400);

  const enriched = questions.map(q => ({
    ...q,
    uploadedBy: req.user.id,
    approved:   req.user.role === 'admin',
  }));

  const inserted = await Question.insertMany(enriched, { ordered: false });

  logger.info(`Bulk uploaded ${inserted.length} questions by ${req.user.email}`);
  res.status(201).json({
    success:  true,
    inserted: inserted.length,
    skipped:  questions.length - inserted.length,
    message:  `${inserted.length} questions added${req.user.role !== 'admin' ? ' (pending admin approval)' : ''}`,
  });
};

// ─── GET /api/questions/subjects ─────────────────────────────
exports.getSubjects = async (req, res) => {
  const cacheKey = `subjects:${req.query.examType || 'all'}:${req.query.curriculum || 'all'}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const filter = { approved: true };
  if (req.query.examType)   filter.examType   = req.query.examType;
  if (req.query.curriculum) filter.curriculum = req.query.curriculum;

  const subjects = await Question.distinct('subject', filter);
  await cacheSet(cacheKey, subjects, 3600);
  res.json({ success: true, data: subjects.sort() });
};

// ─── GET /api/questions/topics ───────────────────────────────
exports.getTopics = async (req, res) => {
  const { examType, subject } = req.query;
  if (!subject) throw new AppError('subject is required', 400);

  const filter = { approved: true, subject: new RegExp(subject, 'i') };
  if (examType) filter.examType = examType;

  const topics = await Question.distinct('topic', filter);
  res.json({ success: true, data: topics.sort() });
};

// ─── GET /api/questions/years ────────────────────────────────
exports.getYears = async (req, res) => {
  const { examType, subject } = req.query;
  const filter = { approved: true };
  if (examType) filter.examType = examType;
  if (subject)  filter.subject  = new RegExp(subject, 'i');

  const years = await Question.distinct('year', filter);
  res.json({ success: true, data: years.filter(Boolean).sort((a, b) => b - a) });
};
