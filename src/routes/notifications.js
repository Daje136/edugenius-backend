'use strict';
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/index');
router.use(authenticate);
router.get  ('/',         ctrl.getNotifications);
router.patch('/read-all', ctrl.markRead);
module.exports = router;
