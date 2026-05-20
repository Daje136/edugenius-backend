'use strict';
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(authenticate);
router.use(ctrl.aiRateLimiter);

router.post('/chat',               validate(schemas.aiChat),              ctrl.chat);
router.post('/generate-questions', validate(schemas.generateQuestions),   ctrl.generateQuestions);
router.post('/explain',                                                    ctrl.explainQuestion);
router.post('/study-plan',                                                 ctrl.generateStudyPlan);
router.post('/grade-theory',                                               ctrl.gradeTheory);

module.exports = router;
