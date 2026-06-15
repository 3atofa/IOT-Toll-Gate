const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { getSummary, exportPdf, getTrafficReport, getSecurityReport, getAlprReport, exportCsv, getFinancialReport, getIncidentsReport, exportFinancialPdf, exportIncidentsPdf } = require('../controllers/reports.controller');

const router = express.Router();

router.get('/summary',  requireAuth, requireRole('admin', 'operator', 'reviewer'), getSummary);
router.get('/pdf',      requireAuth, requireRole('admin', 'operator', 'reviewer'), exportPdf);
router.get('/traffic',  requireAuth, requireRole('admin', 'operator', 'reviewer'), getTrafficReport);
router.get('/security', requireAuth, requireRole('admin', 'operator', 'reviewer'), getSecurityReport);
router.get('/alpr',     requireAuth, requireRole('admin', 'operator', 'reviewer'), getAlprReport);
router.get('/csv',       requireAuth, requireRole('admin', 'operator', 'reviewer'), exportCsv);
router.get('/financial', requireAuth, requireRole('admin', 'operator', 'reviewer'), getFinancialReport);
router.get('/incidents', requireAuth, requireRole('admin', 'operator', 'reviewer'), getIncidentsReport);
router.get('/financial-pdf',  requireAuth, requireRole('admin', 'operator', 'reviewer'), exportFinancialPdf);
router.get('/incidents-pdf',  requireAuth, requireRole('admin', 'operator', 'reviewer'), exportIncidentsPdf);

module.exports = router;
