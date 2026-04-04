const path = require('path');
const fs = require('fs/promises');
const { GateCapture } = require('../models');
const { getSocket } = require('../services/socket.service');
const { enqueueCaptureForAlpr } = require('../services/alpr.service');

const toPublicImageUrl = (req, absolutePath) => {
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const rel = path.relative(uploadsRoot, absolutePath).replace(/\\/g, '/');
  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host');

  if (host) {
    return `${protocol}://${host}/uploads/${rel}`;
  }

  return `/uploads/${rel}`;
};

const buildCapturePayload = (req, imagePath) => ({
  gateId: req.body?.gateId || req.query.gateId || req.get('x-gate-id') || 'gate-1',
  eventType: req.body?.eventType || req.query.eventType || req.get('x-event-type') || 'access_granted',
  cardUid: req.body?.cardUid || req.query.cardUid || req.get('x-card-uid') || null,
  imagePath,
  plateText: null,
  plateConfidence: null,
  ocrStatus: 'pending',
  ocrProcessedAt: null,
  ocrError: null,
  capturedAt: req.body?.capturedAt
    ? new Date(req.body.capturedAt)
    : req.query.capturedAt
      ? new Date(req.query.capturedAt)
      : new Date(),
});

const emitCapture = (capture) => {
  const io = getSocket();
  if (io) {
    io.emit('new_capture', capture);
  }
};

const runAlprAsync = (captureId) => {
  enqueueCaptureForAlpr(captureId);
};

const createCapture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required (field: image)' });
    }

    const payload = {
      ...buildCapturePayload(req, toPublicImageUrl(req, req.file.path)),
    };

    const capture = await GateCapture.create(payload);
    emitCapture(capture);
    runAlprAsync(capture.id);

    return res.status(201).json(capture);
  } catch (error) {
    return next(error);
  }
};

const createRawCapture = async (req, res, next) => {
  try {
    const imageBuffer = req.body;

    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      return res.status(400).json({ message: 'JPEG binary body is required' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'gate');
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = `gate_${Date.now()}_${Math.round(Math.random() * 1e6)}.jpg`;
    const absolutePath = path.join(uploadsDir, fileName);
    await fs.writeFile(absolutePath, imageBuffer);

    const payload = buildCapturePayload(req, toPublicImageUrl(req, absolutePath));
    const capture = await GateCapture.create(payload);
    emitCapture(capture);
    runAlprAsync(capture.id);

    return res.status(201).json(capture);
  } catch (error) {
    return next(error);
  }
};

const updateCaptureOcr = async (req, res, next) => {
  try {
    const capture = await GateCapture.findByPk(req.params.id);
    if (!capture) {
      return res.status(404).json({ message: 'Capture not found' });
    }

    const plateText = String(req.body.plateText || '').toUpperCase().replace(/\s+/g, '') || null;
    const confidence = req.body.plateConfidence == null ? null : Number(req.body.plateConfidence);

    await capture.update({
      plateText,
      plateConfidence: Number.isFinite(confidence) ? confidence : null,
      ocrStatus: req.body.ocrStatus || (plateText ? 'done' : 'review_required'),
      ocrError: req.body.ocrError || null,
      ocrProcessedAt: new Date(),
    });

    emitCapture(capture);
    return res.json(capture);
  } catch (error) {
    return next(error);
  }
};

const retryCaptureOcr = async (req, res, next) => {
  try {
    const capture = await GateCapture.findByPk(req.params.id);
    if (!capture) {
      return res.status(404).json({ message: 'Capture not found' });
    }

    await capture.update({ ocrStatus: 'pending', ocrError: null });
    emitCapture(capture);
    runAlprAsync(capture.id);

    return res.json({ message: 'OCR retry enqueued', id: capture.id });
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
  createRawCapture,
  getCaptures,
  getLatestCapture,
  updateCaptureOcr,
  retryCaptureOcr,
};
