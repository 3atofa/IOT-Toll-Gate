const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { getSummary, exportPdf } = require('../controllers/reports.controller');

const router = express.Router();

router.get('/summary', requireAuth, requireRole('admin', 'operator', 'reviewer'), getSummary);
router.get('/pdf', requireAuth, requireRole('admin', 'operator', 'reviewer'), exportPdf);

module.exports = router;
