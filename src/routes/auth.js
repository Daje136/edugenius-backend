'use strict';

const express          = require('express');
const router           = express.Router();
const ctrl             = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// ── Async error wrapper ───────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Auth routes ───────────────────────────────────────────────────────────────
router.post('/register',              validate(schemas.register), asyncHandler(ctrl.register));
router.post('/login',                 validate(schemas.login),    asyncHandler(ctrl.login));
router.post('/refresh',                                           asyncHandler(ctrl.refresh));
router.post('/logout',                authenticate,               asyncHandler(ctrl.logout));
router.post('/forgot-password',                                   asyncHandler(ctrl.forgotPassword));
router.post('/reset-password/:token',                             asyncHandler(ctrl.resetPassword));
router.get ('/me',                    authenticate,               asyncHandler(ctrl.getMe));

module.exports = router;