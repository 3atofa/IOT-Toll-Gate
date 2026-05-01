const express = require('express');
const gateController = require('../controllers/gate.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireGateToken } = require('../middlewares/api-key.middleware');

const router = express.Router();

// ── Hardware polling endpoint (ESP32 firmware) ────────────────────
// Must be declared BEFORE /:id so it is not matched as an id param.
// ESP32 sends: GET /api/gates/poll-command  with X-Gate-Token header
router.get('/poll-command', requireGateToken, gateController.pollCommand);

// Gate management routes (protected by user JWT)
router.post('/', requireAuth, gateController.createGate);
router.get('/', gateController.getGates);
router.get('/:id', gateController.getGateById);
router.put('/:id', requireAuth, gateController.updateGateStatus);
router.delete('/:id', requireAuth, gateController.deleteGate);

// Regenerate per-gate hardware token (operator only)
router.post('/:id/regenerate-token', requireAuth, gateController.regenerateToken);

module.exports = router;
