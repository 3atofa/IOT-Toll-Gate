const { Gate } = require('../models');
const { getSocket } = require('../services/socket.service');

const createGate = async (req, res, next) => {
  try {
    const { gateId, gateNumber, location, notes } = req.body;
    const gate = await Gate.create({
      gateId: gateId || `gate-${gateNumber || 1}`,
      gateNumber: gateNumber || 1,
      location: location || 'Main Entry',
      notes,
    });
    res.status(201).json(gate);
  } catch (error) {
    next(error);
  }
};

const getGates = async (req, res, next) => {
  try {
    const gates = await Gate.findAll({ order: [['gateNumber', 'ASC']] });
    res.json(gates);
  } catch (error) {
    next(error);
  }
};

const getGateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gate = await Gate.findByPk(id);
    if (!gate) return res.status(404).json({ message: 'Gate not found' });
    res.json(gate);
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
};
