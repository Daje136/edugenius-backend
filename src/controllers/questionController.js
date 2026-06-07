'use strict';
const { Op } = require('sequelize');
const { Question } = require('../models/postgres');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

exports.list = async (req, res, next) => {
  try {
    const { examType, subject, topic, year, type, difficulty, curriculum, approved, page=1, limit=20, search } = req.query;
    const where = {};
    if (examType)   where.examType   = examType;
    if (subject)    where.subject    = { [Op.iLike]: '%'+subject+'%' };
    if (topic)      where.topic      = { [Op.iLike]: '%'+topic+'%' };
    if (type)       where.type       = type;
    if (difficulty) where.difficulty = parseInt(difficulty);
    if (curriculum) where.curriculum = curriculum;
    if (year)       where.year       = parseInt(year);
    if (approved !== undefined) where.isApproved = approved === 'true';
    if (search)     where.body       = { [Op.iLike]: '%'+search+'%' };
    const pg  = Math.max(parseInt(page), 1);
    const lim = Math.min(parseInt(limit), 100);
    const { count, rows } = await Question.findAndCountAll({ where, limit: lim, offset: (pg-1)*lim, order: [['createdAt','DESC']] });
    res.json({ success:true, total:count, page:pg, pages:Math.ceil(count/lim), data:rows });
  } catch(err) { next(err); }
};

exports.getSubjects = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.examType)   where.examType   = req.query.examType;
    if (req.query.curriculum) where.curriculum = req.query.curriculum;
    const rows = await Question.findAll({ where, attributes: [[Question.sequelize.fn('DISTINCT', Question.sequelize.col('subject')), 'subject']], raw:true });
    res.json({ success:true, data:rows.map(r=>r.subject).sort() });
  } catch(err) { next(err); }
};

exports.getTopics = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.examType) where.examType = req.query.examType;
    if (req.query.subject)  where.subject  = req.query.subject;
    const rows = await Question.findAll({ where, attributes: [[Question.sequelize.fn('DISTINCT', Question.sequelize.col('topic')), 'topic']], raw:true });
    res.json({ success:true, data:rows.map(r=>r.topic).filter(Boolean).sort() });
  } catch(err) { next(err); }
};

exports.getYears = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.examType) where.examType = req.query.examType;
    if (req.query.subject)  where.subject  = req.query.subject;
    const rows = await Question.findAll({ where, attributes: [[Question.sequelize.fn('DISTINCT', Question.sequelize.col('year')), 'year']], raw:true });
    res.json({ success:true, data:rows.map(r=>r.year).filter(Boolean).sort((a,b)=>b-a) });
  } catch(err) { next(err); }
};

exports.getRandomQuestions = async (req, res, next) => {
  try {
    const { examType, subject, topic, difficulty, curriculum, count=10 } = req.query;
    const where = { isApproved:true };
    if (examType)   where.examType   = examType;
    if (subject)    where.subject    = subject;
    if (topic)      where.topic      = { [Op.iLike]: '%'+topic+'%' };
    if (difficulty) where.difficulty = parseInt(difficulty);
    if (curriculum) where.curriculum = curriculum;
    const n = Math.min(parseInt(count), 100);
    const pool = await Question.findAll({ where, limit: n*3 });
    const data = pool.sort(()=>Math.random()-0.5).slice(0,n);
    res.json({ success:true, count:data.length, data });
  } catch(err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const q = await Question.findByPk(req.params.id);
    if (!q) return next(new AppError('Question not found', 404));
    res.json({ success:true, data:q });
  } catch(err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { examType, subject, topic, year, type, body, options, answerIndex, workedSolution, difficulty, curriculum, tags } = req.body;
    const q = await Question.create({ examType, subject, topic, year, type, body, options, answerIndex, workedSolution, difficulty, curriculum, tags, createdBy:req.user.id, isApproved:req.user.role==='admin' });
    logger.info('Question created: '+q.id);
    res.status(201).json({ success:true, data:q });
  } catch(err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const q = await Question.findByPk(req.params.id);
    if (!q) return next(new AppError('Question not found', 404));
    if (req.user.role !== 'admin' && q.createdBy !== req.user.id) return next(new AppError('Forbidden', 403));
    const { examType, subject, topic, year, type, body, options, answerIndex, workedSolution, difficulty, curriculum, tags } = req.body;
    await q.update({ examType, subject, topic, year, type, body, options, answerIndex, workedSolution, difficulty, curriculum, tags });
    res.json({ success:true, data:q });
  } catch(err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const q = await Question.findByPk(req.params.id);
    if (!q) return next(new AppError('Question not found', 404));
    await q.destroy();
    res.json({ success:true, message:'Question deleted' });
  } catch(err) { next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    const q = await Question.findByPk(req.params.id);
    if (!q) return next(new AppError('Question not found', 404));
    await q.update({ isApproved:true });
    res.json({ success:true, message:'Question approved', data:q });
  } catch(err) { next(err); }
};

exports.bulkUpload = async (req, res, next) => {
  try {
    let questions = [];
    if (req.file) {
      const { parse } = require('csv-parse/sync');
      const records = parse(req.file.buffer.toString(), { columns:true, skip_empty_lines:true, trim:true });
      questions = records.map(r=>({ examType:r.examType||r.exam_type, subject:r.subject, topic:r.topic||'', year:r.year?parseInt(r.year):null, type:r.type||'MCQ', body:r.body||r.question, options:[r.A||r.optionA,r.B||r.optionB,r.C||r.optionC,r.D||r.optionD].filter(Boolean), answerIndex:r.answerIndex!=null?parseInt(r.answerIndex):null, workedSolution:r.workedSolution||null, difficulty:r.difficulty?parseInt(r.difficulty):3, curriculum:r.curriculum||'NG', tags:r.tags?r.tags.split('|'):[] }));
    } else if (Array.isArray(req.body.questions)) {
      questions = req.body.questions;
    } else {
      return next(new AppError('Send a CSV file or {questions:[...]} JSON', 400));
    }
    if (!questions.length) return next(new AppError('No questions found', 400));
    if (questions.length > 500) return next(new AppError('Max 500 per upload', 400));
    const rows = questions.map(q=>({ ...q, createdBy:req.user.id, isApproved:req.user.role==='admin' }));
    const created = await Question.bulkCreate(rows, { validate:true });
    res.status(201).json({ success:true, inserted:created.length });
  } catch(err) { next(err); }
};
