const express = require('express');
const gateController = require('../controllers/gate.controller');
const apiKeyMiddleware = require('../middlewares/api-key.middleware');

const router = express.Router();

// Gate management routes
router.post('/', gateController.createGate);
router.get('/', gateController.getGates);
router.get('/:id', gateController.getGateById);
router.put('/:id', gateController.updateGateStatus);
router.delete('/:id', gateController.deleteGate);

// Gate control routes
router.post('/:id/open', apiKeyMiddleware.requireGateApiKey, gateController.openGate);
router.post('/:id/close', apiKeyMiddleware.requireGateApiKey, gateController.closeGate);

module.exports = router;
