const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { getSummary, exportPdf, getTrafficReport, getSecurityReport, getAlprReport, exportCsv } = require('../controllers/reports.controller');

const router = express.Router();

router.get('/summary',  requireAuth, requireRole('admin', 'operator', 'reviewer'), getSummary);
router.get('/pdf',      requireAuth, requireRole('admin', 'operator', 'reviewer'), exportPdf);
router.get('/traffic',  requireAuth, requireRole('admin', 'operator', 'reviewer'), getTrafficReport);
router.get('/security', requireAuth, requireRole('admin', 'operator', 'reviewer'), getSecurityReport);
router.get('/alpr',     requireAuth, requireRole('admin', 'operator', 'reviewer'), getAlprReport);
router.get('/csv',      requireAuth, requireRole('admin', 'operator', 'reviewer'), exportCsv);

module.exports = router;
