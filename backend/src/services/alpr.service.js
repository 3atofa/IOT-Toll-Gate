const {
  GateCapture,
  WantedPerson,
  StolenCar,
  SecurityAlert,
} = require('../models');
const { getSocket } = require('./socket.service');

const queue = [];
let busy = false;

const normalizePlate = (plateText) => String(plateText || '').toUpperCase().replace(/\s+/g, '');

const emitCaptureUpdate = (capture) => {
  const io = getSocket();
  if (io) {
    io.emit('capture_ocr_updated', capture);
  }
};

const emitSecurityAlert = (alert) => {
  const io = getSocket();
  if (io) {
    io.emit('security_alert', alert);
  }
};

const toPublicWatchlists = async () => {
  const [wantedPersons, stolenCars] = await Promise.all([
    WantedPerson.findAll({ where: { status: 'active' }, order: [['createdAt', 'DESC']] }),
    StolenCar.findAll({ where: { status: 'active' }, order: [['createdAt', 'DESC']] }),
  ]);

  return {
    wantedPersons: wantedPersons.map((person) => ({
      id: person.id,
      fullName: person.fullName,
      faceLabel: person.faceLabel || person.fullName,
      faceImagePath: person.faceImagePath,
      notes: person.notes,
    })),
    stolenCars: stolenCars.map((car) => ({
      id: car.id,
      plateNumber: car.plateNumber,
      plateNormalized: car.plateNormalized,
      vehicleType: car.vehicleType,
      notes: car.notes,
    })),
  };
};

const normalizeDecision = (payload, capture) => {
  const explicit = String(payload?.securityDecision || '').toLowerCase();
  if (explicit === 'allow' || explicit === 'block' || explicit === 'review') {
    return explicit;
  }

  if (payload?.wantedPersonMatch || payload?.stolenCarMatch) {
    return 'block';
  }

  if (capture.ocrStatus === 'review_required' || capture.faceStatus === 'review_required') {
    return 'review';
  }

  return 'allow';
};

const createSecurityAlertIfNeeded = async (capture, payload, resolvedDecision) => {
  const decision = String(resolvedDecision || payload?.securityDecision || '').toLowerCase();
  const shouldBlock = decision === 'block' || Boolean(payload?.wantedPersonMatch) || Boolean(payload?.stolenCarMatch);

  if (!shouldBlock) {
    return null;
  }

  const alertType = payload?.wantedPersonMatch ? 'wanted_person' : 'stolen_car';
  const detectedPlate = payload?.stolenCarMatch || payload?.plateText || capture?.plateText || 'unknown plate';
  const gateLabel = capture?.gateId || payload?.gateId || 'unknown gate';
  const reason = payload?.securityReason || (alertType === 'wanted_person'
    ? `Wanted person matched: ${payload.wantedPersonMatch}. Car plate: ${detectedPlate}. Gate: ${gateLabel}`
    : `Stolen car matched: ${detectedPlate}. Gate: ${gateLabel}`);

  const alert = await SecurityAlert.create({
    captureId: capture.id,
    alertType,
    decision: 'block',
    reason,
    relatedName: payload?.wantedPersonMatch || null,
    relatedPlate: detectedPlate !== 'unknown plate' ? detectedPlate : null,
    metadata: JSON.stringify({
      plateText: payload?.plateText || null,
      faceName: payload?.faceName || null,
      faceConfidence: payload?.faceConfidence ?? null,
      gateId: capture?.gateId || payload?.gateId || null,
      capturedAt: capture?.capturedAt || payload?.capturedAt || null,
      imagePath: capture?.imagePath || payload?.imagePath || null,
    }),
  });

  emitSecurityAlert(alert);
  return alert;
};

const shouldRequireReview = (plateText, confidence) => {
  if (!plateText) return true;
  if (confidence == null) return true;

  const minConfidence = Number(process.env.ALPR_MIN_CONFIDENCE || 0.75);
  const platePattern = new RegExp(process.env.ALPR_PLATE_REGEX || '^[A-Z0-9-]{4,12}$');

  return confidence < minConfidence || !platePattern.test(plateText);
};

const buildAlprCandidateEndpoints = (configuredEndpoint) => {
  const base = String(configuredEndpoint || '').trim();
  if (!base) {
    return [];
  }

  const candidates = [base];
  if (!/\/recognize\/?$/i.test(base)) {
    candidates.push(`${base.replace(/\/+$/, '')}/recognize`);
  }

  return [...new Set(candidates)];
};

const callAlpr = async (endpointCandidates, payload) => {
  let lastError = null;

  for (const endpoint of endpointCandidates) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-alpr-key': process.env.ALPR_API_KEY || '',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return response.json();
    }

    // Retry next candidate only on obvious route/method mismatch.
    if ((response.status === 404 || response.status === 405) && endpoint !== endpointCandidates[endpointCandidates.length - 1]) {
      lastError = new Error(`ALPR HTTP ${response.status}`);
      continue;
    }

    throw new Error(`ALPR HTTP ${response.status}`);
  }

  throw lastError || new Error('ALPR endpoint unavailable');
};

const processCapture = async (captureId) => {
  const capture = await GateCapture.findByPk(captureId);
  if (!capture) return;

  const alprEnabled = String(process.env.ALPR_ENABLED || 'false').toLowerCase() === 'true';
  const endpoint = process.env.ALPR_ENDPOINT;
  const endpointCandidates = buildAlprCandidateEndpoints(endpoint);

  if (!alprEnabled || endpointCandidates.length === 0) {
    await capture.update({
      ocrStatus: 'review_required',
      ocrError: 'ALPR service not configured',
      ocrProcessedAt: new Date(),
    });
    emitCaptureUpdate(capture);
    return;
  }

  await capture.update({ ocrStatus: 'processing', faceStatus: 'processing', ocrError: null, faceError: null });

  try {
    const watchlists = await toPublicWatchlists();
    const payload = await callAlpr(endpointCandidates, {
      captureId: capture.id,
      imagePath: capture.imagePath,
      gateId: capture.gateId,
      capturedAt: capture.capturedAt,
      wantedPersons: watchlists.wantedPersons,
      stolenCars: watchlists.stolenCars,
    });
    const plateText = normalizePlate(payload.plateText || payload.plate || '');
    const confidenceRaw = payload.plateConfidence ?? payload.confidence;
    const confidence = confidenceRaw == null ? null : Number(confidenceRaw);
    const faceName = payload.faceName || payload.faceLabel || null;
    const faceConfidenceRaw = payload.faceConfidence ?? null;
    const faceConfidence = faceConfidenceRaw == null ? null : Number(faceConfidenceRaw);

    const reviewRequired = shouldRequireReview(plateText, confidence);
    const faceReviewRequired = String(payload.faceReviewRequired || '').toLowerCase() === 'true' || !faceName;
    const securityDecision = normalizeDecision(payload, {
      ocrStatus: reviewRequired ? 'review_required' : 'done',
      faceStatus: faceReviewRequired ? 'review_required' : 'done',
    });

    await capture.update({
      plateText: plateText || null,
      plateConfidence: Number.isFinite(confidence) ? confidence : null,
      faceName,
      faceConfidence: Number.isFinite(faceConfidence) ? faceConfidence : null,
      ocrStatus: reviewRequired ? 'review_required' : 'done',
      faceStatus: faceReviewRequired ? 'review_required' : 'done',
      ocrError: reviewRequired ? 'Low confidence or invalid format' : null,
      faceError: faceReviewRequired ? (payload.faceError || 'No known face match') : null,
      securityDecision,
      securityReason: payload.securityReason || null,
      ocrProcessedAt: new Date(),
    });

    const updatedCapture = await GateCapture.findByPk(capture.id);
    await createSecurityAlertIfNeeded(updatedCapture, payload, securityDecision);

    emitCaptureUpdate(updatedCapture);
  } catch (error) {
    await capture.update({
      ocrStatus: 'failed',
      faceStatus: 'failed',
      ocrError: error.message,
      faceError: error.message,
      securityDecision: 'review',
      securityReason: error.message,
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

const processCaptureImmediately = async (captureId) => processCapture(captureId);

module.exports = {
  enqueueCaptureForAlpr,
  processCaptureImmediately,
};
