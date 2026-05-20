'use strict';
const OpenAI              = require('openai');
const Anthropic           = require('@anthropic-ai/sdk');
const rateLimit           = require('express-rate-limit');
const AppError            = require('../utils/AppError');
const Question            = require('../models/mongo/Question');
const { cacheSet, cacheGet } = require('../utils/cache');
const logger              = require('../utils/logger');
const pool                = require('../config/postgres');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── AI rate limiter (per user) ───────────────────────────────────────────────
exports.aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      parseInt(process.env.AI_RATE_LIMIT_MAX) || 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { success: false, message: 'AI rate limit reached. Please try again in an hour.' },
});

// ── System prompts ───────────────────────────────────────────────────────────
function buildTutorSystemPrompt(subject, examType, studentLevel) {
  return `You are EduGenius — a world-class AI tutor specialised in ${subject || 'all science and mathematics subjects'} for ${examType || 'WAEC and JAMB'} exam preparation.

Student level: ${studentLevel || 'Secondary School (SS3)'}

Your role:
1. Answer questions accurately and clearly.
2. For every problem solution, ALWAYS use this structure:
   - ✅ CORRECT ANSWER
   - 📉 FORMULA(S) USED — list every formula applied
   - 🔓 STEP-BY-STEP WORKING — number each step clearly
   - ⚠️ COMMON MISTAKE — explain the most frequent error students make on this type
   - 💡 TIP — one memorable shortcut or insight
3. Match your language to the student's level — clear, concise, encouraging.
4. Use examples from Nigerian or UK curriculum where relevant.
5. For LaTeX maths, wrap in single $ for inline and $$ for display.
6. Never refuse a legitimate academic question.`;
}

// ── Save chat log to PostgreSQL ──────────────────────────────────────────────
async function saveChatLog(userId, sessionTag, message, reply, subject, tokensUsed) {
  try {
    await pool.query(`
      INSERT INTO chat_logs (user_id, session_tag, messages, subject, tokens_used, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, $5, NOW())
      ON CONFLICT (user_id, session_tag)
      DO UPDATE SET
        messages    = chat_logs.messages || $3::jsonb,
        tokens_used = chat_logs.tokens_used + $5,
        subject     = $4,
        updated_at  = NOW()
    `, [
      userId,
      sessionTag || 'default',
      JSON.stringify([
        { role: 'user',      content: message },
        { role: 'assistant', content: reply   },
      ]),
      subject,
      tokensUsed || 0,
    ]);
  } catch (err) {
    logger.warn('ChatLog save failed:', err.message);
  }
}

// ── POST /api/ai/chat ────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  const { message, subject, history = [] } = req.body;
  const studentLevel = req.user.classLevel || 'SS3';
  const examType     = req.user.examTarget  || 'WAEC';
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
      model:       process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      max_tokens:  parseInt(process.env.OPENAI_MAX_TOKENS) || 1500,
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

    saveChatLog(req.user.id, req.headers['x-session-tag'], message, reply, subject, tokensUsed);

  } catch (err) {
    logger.error('OpenAI chat error:', err);
    res.write(`data: ${JSON.stringify({ error: 'AI service temporarily unavailable' })}\n\n`);
    res.end();
  }
};

// ── POST /api/ai/generate-questions (Claude) ─────────────────────────────────
exports.generateQuestions = async (req, res) => {
  const { subject, topic, examType, year, count = 10, type = 'MCQ', difficulty = 'medium' } = req.body;

  const cacheKey = `aigen:${examType}:${subject}:${topic}:${type}:${count}:${difficulty}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached, fromCache: true });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      messages: [
        {
          role:    'user',
          content: `Generate exactly ${count} ${type} questions for the ${examType} ${subject} exam.
${topic      ? `Topic: ${topic}.`           : ''}
${year       ? `Year style: ${year}.`       : ''}
${difficulty ? `Difficulty: ${difficulty}.` : ''}

Return ONLY a valid JSON array, no preamble, no markdown fences:
[
  {
    "body": "question text",
    "options": ["A text", "B text", "C text", "D text"],
    "answerIndex": 0,
    "workedSolution": "step-by-step explanation",
    "formulasUsed": ["formula1"],
    "commonMistakes": "common error students make",
    "topic": "${topic || subject}",
    "difficulty": 2,
    "tags": ["tag1"]
  }
]`,
        },
      ],
    });

    const raw       = message.content[0].text;
    const cleaned   = raw.replace(/```json|```/g, '').trim();
    let questions   = JSON.parse(cleaned);

    if (!Array.isArray(questions)) throw new Error('Response is not an array');

    questions = questions.map(q => ({
      ...q,
      examType,
      subject,
      topic:         topic || null,
      year:          year  || null,
      isAiGenerated: true,
      approved:      false,
    }));

    Question.insertMany(questions).catch(() => {}); // non-blocking save
    await cacheSet(cacheKey, questions, 7200);

    return res.json({ success: true, count: questions.length, data: questions });

  } catch (err) {
    logger.error('Claude generate error:', err?.status, err?.message);
    const userMessage = err?.status === 400
      ? 'AI credits exhausted. Please contact the administrator.'
      : 'AI question generation failed. Please try again.';
    return res.status(503).json({ success: false, message: userMessage });
  }
};

// ── POST /api/ai/explain ─────────────────────────────────────────────────────
exports.explainQuestion = async (req, res) => {
  const { questionId } = req.body;

  const q = await Question.findById(questionId);
  if (!q) throw new AppError('Question not found', 404);

  const prompt = `Explain the following ${q.examType} ${q.subject} question to a student.
Question: ${q.body}
${q.type === 'MCQ' ? `Options: ${q.options.map((o, i) => `${String.fromCharCode(65+i)}) ${o}`).join(' | ')}
Correct Answer: Option ${String.fromCharCode(65 + q.answerIndex)}` : ''}
${q.workedSolution ? `Known solution: ${q.workedSolution}` : ''}

Provide a crystal-clear step-by-step explanation:
✅ CORRECT ANSWER | 📉 FORMULAS | 🔓 STEPS | ⚠️ COMMON MISTAKE | 💡 TIP`;

  const completion = await openai.chat.completions.create({
    model:       process.env.OPENAI_MODEL || 'gpt-4o',
    messages:    [{ role: 'user', content: prompt }],
    max_tokens:  1200,
    temperature: 0.3,
  });

  res.json({ success: true, explanation: completion.choices[0]?.message?.content, question: q });
};

// ── POST /api/ai/study-plan ──────────────────────────────────────────────────
exports.generateStudyPlan = async (req, res) => {
  const { goal, weakTopics, examSessions } = req.body;
  const user     = req.user;
  const daysLeft = goal?.examDate
    ? Math.ceil((new Date(goal.examDate) - Date.now()) / (1000 * 60 * 60 * 24))
    : 60;

  const prompt = `You are an expert exam coach. Create a personalised weekly study plan.

Student: ${user.firstName} ${user.lastName}
Exam: ${goal?.examType || 'WAEC'}
Days until exam: ${daysLeft}
Weekly study hours: ${goal?.weeklyHours || 8}
Target score: ${goal?.targetScore || 75}%
Weak topics: ${(weakTopics || []).join(', ') || 'None'}
Recent performance: ${examSessions?.slice(0,3).map(s => `${s.subject} ${s.score}%`).join(', ') || 'Not available'}

Return ONLY this JSON:
{
  "summary": "2-sentence overview",
  "weeklySchedule": [{ "day": "Monday", "tasks": [{"subject":"Physics","topic":"Waves","durationMin":45,"type":"practice"}] }],
  "priorityTopics": ["topic1","topic2"],
  "dailyQuestionTarget": 20,
  "readinessScore": 68,
  "advice": "One actionable coaching paragraph"
}`;

  let plan;
  try {
    const completion = await openai.chat.completions.create({
      model:       process.env.OPENAI_MODEL || 'gpt-4o',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  1500,
      temperature: 0.4,
    });
    plan = JSON.parse(completion.choices[0]?.message?.content?.replace(/```json|```/g, '').trim());
  } catch (err) {
    logger.error('Study plan AI error:', err);
    throw new AppError('Could not generate study plan. Please retry.', 503);
  }

  res.json({ success: true, studyPlan: plan });
};

// ── POST /api/ai/grade-theory ────────────────────────────────────────────────
exports.gradeTheory = async (req, res) => {
  const { question, modelAnswer, studentAnswer, maxScore = 10 } = req.body;

  const prompt = `You are an exam grader. Grade this student answer fairly.

Question: ${question}
Model Answer: ${modelAnswer || 'Use your knowledge'}
Student Answer: ${studentAnswer}
Maximum Score: ${maxScore}

Return ONLY this JSON:
{
  "score": 0,
  "percentage": 0,
  "grade": "F",
  "passed": false,
  "feedback": "Constructive feedback",
  "strengths": ["point1"],
  "improvements": ["point1"],
  "rubricBreakdown": [{"criterion":"...","awarded":0,"max":${maxScore}}]
}`;

  let grading;
  try {
    const completion = await openai.chat.completions.create({
      model:       process.env.OPENAI_MODEL || 'gpt-4o',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  800,
      temperature: 0.2,
    });
    grading = JSON.parse(completion.choices[0]?.message?.content?.replace(/```json|```/g, '').trim());
  } catch (err) {
    logger.error('AI grading error:', err);
    throw new AppError('Grading service failed. Please retry.', 503);
  }

  res.json({ success: true, grading });
};
