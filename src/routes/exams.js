'use strict';
const express     = require('express');
const router      = express.Router();
const ctrl        = require('../controllers/examController');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(authenticate);

router.get ('/questions',         ctrl.getQuestions);
router.post('/start',             ctrl.startSession);
router.post('/submit',            validate(schemas.submitExam), ctrl.submitExam);
router.get ('/sessions',          ctrl.getSessions);
router.get ('/sessions/:id',      ctrl.getSession);
router.get ('/leaderboard',       ctrl.getLeaderboard);

module.exports = router;
