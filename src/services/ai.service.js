'use strict';

const OpenAI = require('openai');
const logger = require('../config/logger');

// ── Groq client (OpenAI-compatible) ─────────────────────────────────────────
const openai = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL      = process.env.OPENAI_MODEL      || 'llama-3.3-70b-versatile';
const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS) || 1500;

// ── System prompts ───────────────────────────────────────────────────────────
const SYSTEM_PROMPTS = {
  tutor: `You are EduGenius AI, an expert education tutor for secondary school and university students.
You specialise in Nigerian curriculum (WAEC, JAMB, NECO, POST-UTME) and UK curriculum (GCSE, A-Level).
Always:
- Give clear, step-by-step explanations
- Use examples relevant to the student's level
- Encourage and motivate students
- Keep answers concise but complete
- Format answers with numbered steps or bullet points when helpful`,

  examQuestion: `You are an expert exam question generator for secondary school students.
Generate high-quality multiple-choice questions in the exact JSON format requested.
Questions must match the specified subject, topic, difficulty, and exam type (WAEC, JAMB, NECO, GCSE, A-Level).
Always return valid JSON only — no extra text, no markdown.`,

  essay: `You are an expert essay writing assistant for students.
Help students improve their essays with clear, constructive feedback.
Focus on structure, arguments, evidence, and language.`,

  summary: `You are an expert at summarising educational content clearly and concisely.
Create summaries that are easy to understand and highlight the key points.`,
};

// ── Helper: call Groq API ────────────────────────────────────────────────────
async function callAI(systemPrompt, userMessage, options = {}) {
  const {
    maxTokens    = MAX_TOKENS,
    temperature  = 0.7,
    jsonMode     = false,
  } = options;

  const requestOptions = {
    model:       MODEL,
    max_tokens:  maxTokens,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
  };

  if (jsonMode) {
    requestOptions.response_format = { type: 'json_object' };
  }

  const response = await openai.chat.completions.create(requestOptions);
  return response.choices[0].message.content;
}

// ── 1. Answer a student question ─────────────────────────────────────────────
async function answerQuestion(question, subject, gradeLevel, examType) {
  logger.info(`AI: answering question — subject=${subject}, grade=${gradeLevel}`);

  const userMessage = `
Subject: ${subject || 'General'}
Grade Level: ${gradeLevel || 'Secondary'}
Exam Type: ${examType || 'General'}

Student Question: ${question}

Please provide a clear, detailed explanation with examples where appropriate.
  `.trim();

  return callAI(SYSTEM_PROMPTS.tutor, userMessage, { temperature: 0.6 });
}

// ── 2. Generate exam questions ───────────────────────────────────────────────
async function generateExamQuestions(subject, topic, count, difficulty, examType) {
  logger.info(`AI: generating ${count} questions — subject=${subject}, topic=${topic}`);

  const userMessage = `
Generate exactly ${count} multiple-choice questions.

Subject:    ${subject}
Topic:      ${topic}
Difficulty: ${difficulty || 'medium'}
Exam Type:  ${examType   || 'WAEC'}

Return ONLY this JSON structure (no extra text):
{
  "questions": [
    {
      "question": "Question text here?",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct_answer": "A",
      "explanation": "Why A is correct"
    }
  ]
}
  `.trim();

  const raw = await callAI(SYSTEM_PROMPTS.examQuestion, userMessage, {
    temperature: 0.8,
    maxTokens:   2000,
    jsonMode:    true,
  });

  try {
    const parsed = JSON.parse(raw);
    return parsed.questions || [];
  } catch (err) {
    logger.error('AI: failed to parse exam questions JSON', { error: err.message, raw });
    throw new Error('Failed to generate valid exam questions. Please try again.');
  }
}

// ── 3. Chat with AI tutor (multi-turn) ───────────────────────────────────────
async function chatWithTutor(messages, subject, gradeLevel) {
  logger.info(`AI: tutor chat — subject=${subject}, messages=${messages.length}`);

  const systemPrompt = `${SYSTEM_PROMPTS.tutor}
Current subject: ${subject || 'General'}
Student grade level: ${gradeLevel || 'Secondary'}`;

  const response = await openai.chat.completions.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  });

  return response.choices[0].message.content;
}

// ── 4. Essay feedback ─────────────────────────────────────────────────────────
async function getEssayFeedback(essay, topic, gradeLevel) {
  logger.info(`AI: essay feedback — topic=${topic}`);

  const userMessage = `
Topic: ${topic}
Grade Level: ${gradeLevel || 'Secondary'}

Essay:
${essay}

Please provide detailed feedback covering:
1. Structure and organisation
2. Quality of arguments
3. Use of evidence
4. Language and style
5. Overall score out of 10
6. Three specific improvements
  `.trim();

  return callAI(SYSTEM_PROMPTS.essay, userMessage, { temperature: 0.5 });
}

// ── 5. Summarise content ──────────────────────────────────────────────────────
async function summariseContent(content, subject, gradeLevel) {
  logger.info(`AI: summarising content — subject=${subject}`);

  const userMessage = `
Subject: ${subject || 'General'}
Grade Level: ${gradeLevel || 'Secondary'}

Content to summarise:
${content}

Create a clear, concise summary with:
- Key concepts (bullet points)
- Important definitions
- Main takeaways
  `.trim();

  return callAI(SYSTEM_PROMPTS.summary, userMessage, { temperature: 0.4 });
}

// ── 6. Generate study plan ───────────────────────────────────────────────────
async function generateStudyPlan(subjects, examDate, hoursPerDay, weakAreas) {
  logger.info('AI: generating study plan');

  const userMessage = `
Create a personalised study plan for a student.

Subjects:       ${subjects.join(', ')}
Exam Date:      ${examDate}
Hours Per Day:  ${hoursPerDay}
Weak Areas:     ${weakAreas ? weakAreas.join(', ') : 'None specified'}

Provide a week-by-week study plan with:
- Daily time allocations per subject
- Focus topics for weak areas
- Revision schedule for the final week
- Tips for exam preparation
  `.trim();

  return callAI(SYSTEM_PROMPTS.tutor, userMessage, {
    temperature: 0.6,
    maxTokens:   2000,
  });
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  answerQuestion,
  generateExamQuestions,
  chatWithTutor,
  getEssayFeedback,
  summariseContent,
  generateStudyPlan,
};