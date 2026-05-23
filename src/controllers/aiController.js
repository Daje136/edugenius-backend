'use strict';
const OpenAI              = require('openai');
const Anthropic           = require('@anthropic-ai/sdk');
const rateLimit           = require('express-rate-limit');
const AppError            = require('../utils/AppError');
const { cacheSet, cacheGet } = require('../utils/cache');
const logger              = require('../utils/logger');
const pool                = require('../config/postgres');

// ── Groq client (OpenAI-compatible) ─────────────────────────────────────────
const openai = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GROQ_MODEL = process.env.OPENAI_MODEL || 'llama-3.3-70b-versatile';
const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS) || 1500;

// ── AI rate limiter ───────────────────────────────────────────────────────────
exports.aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      parseInt(process.env.AI_RATE_LIMIT_MAX) || 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { success: false, message: 'AI rate limit reached. Please try again in an hour.' },
});

// ── System prompt ─────────────────────────────────────────────────────────────
function buildTutorSystemPrompt(subject, examType, studentLevel) {
  return `You are EduGenius — a world-class AI tutor specialised in ${subject || 'all subjects'} for ${examType || 'WAEC and JAMB'} exam preparation.

Student level: ${studentLevel || 'Secondary School (SS3)'}

Your role:
1. Answer questions accurately and clearly.
2. For every problem, use this structure:
   - CORRECT ANSWER
   - FORMULA(S) USED
   - STEP-BY-STEP WORKING
   - COMMON MISTAKE
   - TIP
3. Match language to student level — clear, concise, encouraging.
4. Use examples from Nigerian or UK curriculum where relevant.`;
}

// ── Save chat log ─────────────────────────────────────────────────────────────
async function saveChatLog(userId, message, reply, subject) {
  try {
    await pool.query(
      `INSERT INTO chat_logs (student_id, role, message, created_at)
       VALUES ($1, $2, $3, NOW()), ($1, $4, $5, NOW())`,
      [userId, 'user', message, 'assistant', reply]
    );
  } catch (err) {
    logger.warn('ChatLog save failed:', err.message);
  }
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  const { message, subject, history = [] } = req.body;
  const studentLevel = req.user?.classLevel || 'SS3';
  const examType     = req.user?.examTarget  || 'WAEC';
  const systemPrompt = buildTutorSystemPrompt(subject, examType, studentLevel);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-18),
    { role: 'user', content: message },
  ];

  let reply      = '';
  let tokensUsed = 0;

  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const stream = await openai.chat.completions.create({
      model:       GROQ_MODEL,
      messages,
      max_tokens:  MAX_TOKENS,
      temperature: 0.4,
      stream:      true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        reply += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
      if (chunk.usage) tokensUsed = chunk.usage.total_tokens;
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    saveChatLog(req.user.id, message, reply, subject);

  } catch (err) {
    logger.error('OpenAI chat error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'AI service temporarily unavailable' })}\n\n`);
    res.end();
  }
};

// ── POST /api/ai/generate-questions ──────────────────────────────────────────
exports.generateQuestions = async (req, res) => {
  const { subject, topic, examType, year, count = 10, type = 'MCQ', difficulty = 'medium' } = req.body;

  const cacheKey = `aigen:${examType}:${subject}:${topic}:${type}:${count}:${difficulty}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached, fromCache: true });

  try {
    const completion = await openai.chat.completions.create({
      model:       GROQ_MODEL,
      max_tokens:  2000,
      temperature: 0.7,
      messages: [{
        role:    'user',
        content: `Generate exactly ${count} ${type} questions for ${examType} ${subject} exam.
${topic      ? `Topic: ${topic}.`       : ''}
${year       ? `Year style: ${year}.`   : ''}
Difficulty: ${difficulty}.

Return ONLY a valid JSON array, no markdown:
[{"body":"question","options":["A","B","C","D"],"answerIndex":0,"workedSolution":"explanation","topic":"${topic || subject}","difficulty":2}]`,
      }],
    });

    const raw     = completion.choices[0]?.message?.content || '[]';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let questions = JSON.parse(cleaned);

    if (!Array.isArray(questions)) throw new Error('Response is not an array');

    questions = questions.map(q => ({
      ...q,
      examType,
      subject,
      topic:         topic || null,
      isAiGenerated: true,
    }));

    await cacheSet(cacheKey, questions, 7200);
    return res.json({ success: true, count: questions.length, data: questions });

  } catch (err) {
    logger.error('Generate questions error:', err.message);
    return res.status(503).json({ success: false, message: 'AI question generation failed. Please try again.' });
  }
};

// ── POST /api/ai/explain ──────────────────────────────────────────────────────
exports.explainQuestion = async (req, res) => {
  const { question, subject, options, answerIndex } = req.body;
  if (!question) throw new AppError('question is required', 400);

  const prompt = `Explain this ${subject || ''} exam question to a student.
Question: ${question}
${options ? `Options: ${options.map((o, i) => `${String.fromCharCode(65+i)}) ${o}`).join(' | ')}` : ''}
${answerIndex !== undefined ? `Correct Answer: Option ${String.fromCharCode(65 + answerIndex)}` : ''}

Give a crystal-clear step-by-step explanation with: CORRECT ANSWER | FORMULAS | STEPS | COMMON MISTAKE | TIP`;

  const completion = await openai.chat.completions.create({
    model:       GROQ_MODEL,
    messages:    [{ role: 'user', content: prompt }],
    max_tokens:  1200,
    temperature: 0.3,
  });

  res.json({ success: true, explanation: completion.choices[0]?.message?.content });
};

// ── POST /api/ai/study-plan ───────────────────────────────────────────────────
exports.generateStudyPlan = async (req, res) => {
  const { goal, weakTopics } = req.body;
  const user     = req.user;
  const daysLeft = goal?.examDate
    ? Math.ceil((new Date(goal.examDate) - Date.now()) / (1000 * 60 * 60 * 24))
    : 60;

  const prompt = `Create a personalised weekly study plan.
Student: ${user.firstName || ''} ${user.lastName || ''}
Exam: ${goal?.examType || 'WAEC'}
Days until exam: ${daysLeft}
Weekly study hours: ${goal?.weeklyHours || 8}
Target score: ${goal?.targetScore || 75}%
Weak topics: ${(weakTopics || []).join(', ') || 'None specified'}

Return ONLY this JSON:
{"summary":"overview","weeklySchedule":[{"day":"Monday","tasks":[{"subject":"Physics","topic":"Waves","durationMin":45}]}],"priorityTopics":["topic1"],"dailyQuestionTarget":20,"advice":"coaching paragraph"}`;

  try {
    const completion = await openai.chat.completions.create({
      model:       GROQ_MODEL,
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  MAX_TOKENS,
      temperature: 0.4,
    });
    const plan = JSON.parse(completion.choices[0]?.message?.content?.replace(/```json|```/g, '').trim());
    res.json({ success: true, studyPlan: plan });
  } catch (err) {
    logger.error('Study plan error:', err.message);
    throw new AppError('Could not generate study plan. Please retry.', 503);
  }
};

// ── POST /api/ai/grade-theory ─────────────────────────────────────────────────
exports.gradeTheory = async (req, res) => {
  const { question, modelAnswer, studentAnswer, maxScore = 10 } = req.body;

  const prompt = `Grade this student answer fairly.
Question: ${question}
Model Answer: ${modelAnswer || 'Use your knowledge'}
Student Answer: ${studentAnswer}
Maximum Score: ${maxScore}

Return ONLY this JSON:
{"score":0,"percentage":0,"grade":"F","passed":false,"feedback":"feedback","strengths":["point"],"improvements":["point"]}`;

  try {
    const completion = await openai.chat.completions.create({
      model:       GROQ_MODEL,
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  800,
      temperature: 0.2,
    });
    const grading = JSON.parse(completion.choices[0]?.message?.content?.replace(/```json|```/g, '').trim());
    res.json({ success: true, grading });
  } catch (err) {
    logger.error('AI grading error:', err.message);
    throw new AppError('Grading service failed. Please retry.', 503);
  }
};
