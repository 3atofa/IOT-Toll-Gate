const { Gate } = require('../models');

/**
 * Per-gate token authentication.
 *
 * The ESP32 / Arduino firmware must send:
 *   X-Gate-Token: <token shown at gate creation>
 *
 * If valid, req.gate is populated so downstream controllers
 * can trust req.gate.gateId without reading the request body.
 */
const requireGateToken = async (req, res, next) => {
  const token = req.get('X-Gate-Token');

  if (!token) {
    return res.status(401).json({ message: 'Missing X-Gate-Token header' });
  }

  try {
    const gate = await Gate.findOne({ where: { token } });

    if (!gate) {
      return res.status(401).json({ message: 'Invalid gate token' });
    }

    if (!gate.isActive) {
      return res.status(403).json({ message: 'Gate is disabled' });
    }

    req.gate = gate;
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  requireGateToken,
};

