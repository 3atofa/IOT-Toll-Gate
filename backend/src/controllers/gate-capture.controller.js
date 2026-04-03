const path = require('path');
const { GateCapture } = require('../models');
const { getSocket } = require('../services/socket.service');

const toPublicImageUrl = (req, absolutePath) => {
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const rel = path.relative(uploadsRoot, absolutePath).replace(/\\/g, '/');
  return `${req.protocol}://${req.get('host')}/uploads/${rel}`;
};

const createCapture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required (field: image)' });
    }

    const payload = {
      gateId: req.body.gateId || 'gate-1',
      eventType: req.body.eventType || 'access_granted',
      cardUid: req.body.cardUid || null,
      imagePath: toPublicImageUrl(req, req.file.path),
      capturedAt: req.body.capturedAt ? new Date(req.body.capturedAt) : new Date(),
    };

    const capture = await GateCapture.create(payload);

    const io = getSocket();
    if (io) {
      io.emit('new_capture', capture);
    }

    return res.status(201).json(capture);
  } catch (error) {
    return next(error);
  }
};

const getCaptures = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const offset = Number(req.query.offset || 0);

    const result = await GateCapture.findAndCountAll({
      order: [['capturedAt', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      total: result.count,
      limit,
      offset,
      items: result.rows,
    });
  } catch (error) {
    return next(error);
  }
};

const getLatestCapture = async (req, res, next) => {
  try {
    const item = await GateCapture.findOne({ order: [['capturedAt', 'DESC']] });

    if (!item) {
      return res.status(404).json({ message: 'No captures found yet' });
    }

    return res.json(item);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createCapture,
  getCaptures,
  getLatestCapture,
};
