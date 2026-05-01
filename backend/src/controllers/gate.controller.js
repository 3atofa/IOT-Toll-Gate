const { v4: uuidv4 } = require('uuid');
const { Gate } = require('../models');
const { getSocket } = require('../services/socket.service');

/** Columns returned to the web dashboard — token is excluded from list/detail views */
const SAFE_ATTRS = { exclude: ['token'] };

const createGate = async (req, res, next) => {
  try {
    const { gateId, gateNumber, location, notes } = req.body;

    if (!location || !String(location).trim()) {
      return res.status(400).json({ message: 'location is required' });
    }
    if (!gateNumber || isNaN(Number(gateNumber))) {
      return res.status(400).json({ message: 'gateNumber is required and must be a number' });
    }

    const num = Number(gateNumber);
    const derivedId = gateId || `gate-${num}`;

    const gate = await Gate.create({
      gateId: derivedId,
      gateNumber: num,
      location: String(location).trim(),
      notes: notes || null,
    });

    // Return the full record including token — this is the only time the token is revealed
    return res.status(201).json(gate);
  } catch (error) {
    next(error);
  }
};

const getGates = async (req, res, next) => {
  try {
    const gates = await Gate.findAll({
      attributes: SAFE_ATTRS,
      order: [['gateNumber', 'ASC']],
    });
    res.json(gates);
  } catch (error) {
    next(error);
  }
};

const getGateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gate = await Gate.findByPk(id, { attributes: SAFE_ATTRS });
    if (!gate) return res.status(404).json({ message: 'Gate not found' });
    res.json(gate);
  } catch (error) {
    next(error);
  }
};

const regenerateToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gate = await Gate.findByPk(id);
    if (!gate) return res.status(404).json({ message: 'Gate not found' });

    gate.token = uuidv4();
    await gate.save();

    // Return only the new token — update firmware and then it is gone
    return res.json({
      message: 'Token regenerated. Update your firmware with the new token.',
      gateId: gate.gateId,
      token: gate.token,
    });
  } catch (error) {
    next(error);
  }
};

const openGate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commandedBy } = req.body;

    const gate = await Gate.findByPk(id);
    if (!gate) return res.status(404).json({ message: 'Gate not found' });

    gate.status = 'open';
    gate.lastCommand = 'open';
    gate.lastCommandAt = new Date();
    gate.commandedBy = commandedBy || 'system';
    await gate.save();

    const io = getSocket();
    if (io) {
      io.emit('gate_status_changed', {
        gateId: gate.id,
        status: 'open',
        timestamp: new Date(),
        commandedBy: gate.commandedBy,
      });
    }

    res.json({ message: 'Gate opened successfully', gate });
  } catch (error) {
    next(error);
  }
};

const closeGate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commandedBy } = req.body;

    const gate = await Gate.findByPk(id);
    if (!gate) return res.status(404).json({ message: 'Gate not found' });

    gate.status = 'closed';
    gate.lastCommand = 'close';
    gate.lastCommandAt = new Date();
    gate.commandedBy = commandedBy || 'system';
    await gate.save();

    const io = getSocket();
    if (io) {
      io.emit('gate_status_changed', {
        gateId: gate.id,
        status: 'closed',
        timestamp: new Date(),
        commandedBy: gate.commandedBy,
      });
    }

    res.json({ message: 'Gate closed successfully', gate });
  } catch (error) {
    next(error);
  }
};

const updateGateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, commandedBy } = req.body;

    const gate = await Gate.findByPk(id);
    if (!gate) return res.status(404).json({ message: 'Gate not found' });

    if (status) {
      gate.status = status;
      gate.lastCommand = status;
      gate.lastCommandAt = new Date();
      gate.commandedBy = commandedBy || 'system';

      // Queue a hardware command so ESP32 picks it up on next poll
      if (status === 'open')   gate.pendingCommand = 'open';
      else if (status === 'closed') gate.pendingCommand = 'close';
    }
    if (notes) gate.notes = notes;

    await gate.save();

    const io = getSocket();
    if (io) {
      io.emit('gate_status_changed', {
        gateId: gate.id,
        status: gate.status,
        timestamp: new Date(),
      });
    }

    res.json(gate);
  } catch (error) {
    next(error);
  }
};

/**
 * Called by ESP32 firmware every few seconds.
 * Returns the pending command and immediately clears it so it is consumed once.
 * Authenticated by gate token (req.gate is set by requireGateToken middleware).
 */
const pollCommand = async (req, res, next) => {
  try {
    const gate = req.gate; // set by requireGateToken

    const command = gate.pendingCommand || 'none';

    // Consume the command — reset to 'none' so it is not delivered twice
    if (command !== 'none') {
      gate.pendingCommand = 'none';
      await gate.save();
    }

    return res.json({ command, gateId: gate.gateId });
  } catch (error) {
    next(error);
  }
};

const deleteGate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gate = await Gate.findByPk(id);
    if (!gate) return res.status(404).json({ message: 'Gate not found' });
    await gate.destroy();
    res.json({ message: 'Gate deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGate,
  getGates,
  getGateById,
  openGate,
  closeGate,
  updateGateStatus,
  deleteGate,
  regenerateToken,
  pollCommand,
};
