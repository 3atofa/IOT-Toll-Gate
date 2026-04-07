const express = require('express');
const gateCaptureRoutes = require('./gate-capture.routes');
const gateRoutes = require('./gate.routes');
const vehicleRoutes = require('./vehicle.routes');
const cardRoutes = require('./allowed-card.routes');
const securityRoutes = require('./security.routes');
const authRoutes = require('./auth.routes');
const reportsRoutes = require('./reports.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'toll-gate-api' });
});

// Gate capture (image) endpoints
router.use('/captures', gateCaptureRoutes);

// Gate control endpoints
router.use('/gates', gateRoutes);

// Vehicle management endpoints
router.use('/vehicles', vehicleRoutes);

// RFID card management endpoints
router.use('/cards', cardRoutes);

// Security watchlist and alerts
router.use('/security', securityRoutes);

// Authentication and user management
router.use('/auth', authRoutes);

// PDF reports and summaries
router.use('/reports', reportsRoutes);

module.exports = router;
