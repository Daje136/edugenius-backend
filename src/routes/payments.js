'use strict';
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

router.post('/initialize', authenticate, ctrl.initializePayment);
router.post('/verify',     authenticate, ctrl.verifyPayment);
router.post('/webhook',    ctrl.webhook);

module.exports = router;