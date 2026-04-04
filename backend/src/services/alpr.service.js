const { GateCapture } = require('../models');
const { getSocket } = require('./socket.service');

const queue = [];
let busy = false;

const normalizePlate = (plateText) => String(plateText || '').toUpperCase().replace(/\s+/g, '');

const shouldRequireReview = (plateText, confidence) => {
  if (!plateText) return true;
  if (confidence == null) return true;

  const minConfidence = Number(process.env.ALPR_MIN_CONFIDENCE || 0.75);
  const platePattern = new RegExp(process.env.ALPR_PLATE_REGEX || '^[A-Z0-9-]{4,12}$');

  return confidence < minConfidence || !platePattern.test(plateText);
};

const emitCaptureUpdate = (capture) => {
  const io = getSocket();
  if (io) {
    io.emit('capture_ocr_updated', capture);
  }
};

const processCapture = async (captureId) => {
  const capture = await GateCapture.findByPk(captureId);
  if (!capture) return;

  const alprEnabled = String(process.env.ALPR_ENABLED || 'false').toLowerCase() === 'true';
  const endpoint = process.env.ALPR_ENDPOINT;

  if (!alprEnabled || !endpoint) {
    await capture.update({
      ocrStatus: 'review_required',
      ocrError: 'ALPR service not configured',
      ocrProcessedAt: new Date(),
    });
    emitCaptureUpdate(capture);
    return;
  }

  await capture.update({ ocrStatus: 'processing', ocrError: null });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-alpr-key': process.env.ALPR_API_KEY || '',
      },
      body: JSON.stringify({
        captureId: capture.id,
        imagePath: capture.imagePath,
        gateId: capture.gateId,
        capturedAt: capture.capturedAt,
      }),
    });

    if (!response.ok) {
      throw new Error(`ALPR HTTP ${response.status}`);
    }

    const payload = await response.json();
    const plateText = normalizePlate(payload.plateText || payload.plate || '');
    const confidenceRaw = payload.confidence;
    const confidence = confidenceRaw == null ? null : Number(confidenceRaw);

    const reviewRequired = shouldRequireReview(plateText, confidence);

    await capture.update({
      plateText: plateText || null,
      plateConfidence: Number.isFinite(confidence) ? confidence : null,
      ocrStatus: reviewRequired ? 'review_required' : 'done',
      ocrError: reviewRequired ? 'Low confidence or invalid format' : null,
      ocrProcessedAt: new Date(),
    });

    emitCaptureUpdate(capture);
  } catch (error) {
    await capture.update({
      ocrStatus: 'failed',
      ocrError: error.message,
      ocrProcessedAt: new Date(),
    });

    emitCaptureUpdate(capture);
  }
};

const drainQueue = async () => {
  if (busy) return;
  busy = true;

  try {
    while (queue.length > 0) {
      const captureId = queue.shift();
      await processCapture(captureId);
    }
  } finally {
    busy = false;
  }
};

const enqueueCaptureForAlpr = (captureId) => {
  queue.push(captureId);
  setImmediate(() => {
    drainQueue().catch((error) => {
      console.error('ALPR queue failed:', error);
    });
  });
};

module.exports = {
  enqueueCaptureForAlpr,
};
