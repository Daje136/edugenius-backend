'use strict';
const Joi          = require('joi');
const { AppError } = require('./errorHandler');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      const msg = error.details.map(d => d.message.replace(/"/g, '')).join('. ');
      return next(new AppError(msg, 400));
    }
    req[source] = value;
    next();
  };
}

const schemas = {

  register: Joi.object({
    firstName:  Joi.string().trim().min(2).max(50).required(),
    lastName:   Joi.string().trim().min(2).max(50).required(),
    email:      Joi.string().email().lowercase().required(),
    password:   Joi.string().min(8).max(72).required(),
    role:       Joi.string().valid('student', 'teacher', 'admin').default('student'),
    schoolId:   Joi.string().uuid().optional(),
    classLevel: Joi.string().max(20).optional(),
    examTarget: Joi.string().valid('WAEC', 'JAMB', 'UK_GCSE', 'A_LEVEL', 'BOTH').optional(),
  }),

  login: Joi.object({
    email:    Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }),

  question: Joi.object({
    examType:       Joi.string().valid('WAEC', 'JAMB', 'UK_GCSE', 'A_LEVEL', 'PRIMARY').required(),
    subject:        Joi.string().trim().max(60).required(),
    topic:          Joi.string().trim().max(100).required(),
    year:           Joi.number().integer().min(1990).max(2030).optional(),
    type:           Joi.string().valid('MCQ', 'theory', 'practical').default('MCQ'),
    body:           Joi.string().trim().required(),
    options:        Joi.array().items(Joi.string().trim()).min(2).max(6).when('type', { is: 'MCQ', then: Joi.required() }),
    answerIndex:    Joi.number().integer().min(0).max(5).when('type', { is: 'MCQ', then: Joi.required() }),
    workedSolution: Joi.string().trim().optional(),
    difficulty:     Joi.number().integer().min(1).max(5).default(3),
    curriculum:     Joi.string().valid('NG', 'UK', 'BOTH').default('NG'),
    tags:           Joi.array().items(Joi.string()).optional(),
  }),

  submitExam: Joi.object({
    sessionId:  Joi.string().uuid().required(),
    answers:    Joi.array().items(
      Joi.object({
        questionId: Joi.string().required(),
        selected:   Joi.number().integer().allow(null),
      })
    ).required(),
    timeSpentSeconds: Joi.number().integer().min(0).required(),
  }),

  goal: Joi.object({
    targetScore:    Joi.number().min(0).max(100).required(),
    examDate:       Joi.date().iso().required(),
    weeklyHours:    Joi.number().min(1).max(100).required(),
    examType:       Joi.string().valid('WAEC', 'JAMB', 'UK_GCSE', 'A_LEVEL').required(),
    targetSubjects: Joi.array().items(Joi.string()).optional(),
  }),

  assignment: Joi.object({
    title:       Joi.string().trim().max(200).required(),
    description: Joi.string().trim().max(1000).optional(),
    classId:     Joi.string().uuid().required(),
    questionIds: Joi.array().items(Joi.string()).min(1).required(),
    deadline:    Joi.date().iso().greater('now').required(),
    aiGraded:    Joi.boolean().default(true),
  }),

  aiChat: Joi.object({
    message:  Joi.string().trim().min(1).max(2000).required(),
    subject:  Joi.string().trim().max(60).optional(),
    history:  Joi.array().items(
      Joi.object({ role: Joi.string().valid('user','assistant').required(), content: Joi.string().required() })
    ).max(20).optional(),
  }),

  generateQuestions: Joi.object({
    examType:   Joi.string().valid('WAEC', 'JAMB', 'UK_GCSE', 'A_LEVEL').required(),
    subject:    Joi.string().trim().required(),
    topic:      Joi.string().trim().optional().allow('', 'undefined').default(null),
    type:       Joi.string().valid('MCQ', 'theory', 'practical', 'mixed').default('MCQ'),
    count:      Joi.number().integer().min(1).max(30).default(10),
    difficulty: Joi.string().valid('easy', 'medium', 'hard', 'adaptive').default('adaptive'),
    year:       Joi.number().integer().min(1990).max(2030).optional(),
  }),
};

module.exports = { validate, schemas };