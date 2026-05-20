'use strict';
// ============================================================
// routes/auth.js
// ============================================================
const express     = require('express');
const router      = express.Router();
const ctrl        = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.post('/register',        validate(schemas.register),  ctrl.register);
router.post('/login',           validate(schemas.login),     ctrl.login);
router.post('/refresh',                                       ctrl.refresh);
router.post('/logout',          authenticate,                 ctrl.logout);
router.post('/forgot-password',                               ctrl.forgotPassword);
router.post('/reset-password/:token',                         ctrl.resetPassword);
router.get ('/me',              authenticate,                 ctrl.getMe);

module.exports = router;
