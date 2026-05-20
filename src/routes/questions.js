'use strict';
const express     = require('express');
const router      = express.Router();
const multer      = require('multer');
const ctrl        = require('../controllers/questionController');
const { authenticate, requireTeacher, requireAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// Public (authenticated)
router.get ('/',              ctrl.list);
router.get ('/subjects',      ctrl.getSubjects);
router.get ('/topics',        ctrl.getTopics);
router.get ('/years',         ctrl.getYears);
router.get ('/:id',           ctrl.getOne);

// Teacher / Admin only
router.post('/',              requireTeacher, validate(schemas.question), ctrl.create);
router.put ('/:id',           requireTeacher, validate(schemas.question), ctrl.update);
router.delete('/:id',         requireAdmin,   ctrl.remove);
router.patch('/:id/approve',  requireAdmin,   ctrl.approve);
router.post('/bulk-upload',   requireTeacher, upload.single('file'), ctrl.bulkUpload);

module.exports = router;
