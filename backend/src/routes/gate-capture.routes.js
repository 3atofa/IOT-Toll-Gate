const express = require('express');
const path = require('path');
const multer = require('multer');
const { requireGateApiKey } = require('../middlewares/api-key.middleware');
const {
  createCapture,
  createRawCapture,
  getCaptures,
  getLatestCapture,
} = require('../controllers/gate-capture.controller');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'gate'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    const base = `gate_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

const rawImageUpload = express.raw({
  limit: '8mb',
  type: (req) => {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    return contentType.includes('image/jpeg') || contentType.includes('application/octet-stream');
  },
});

router.post('/', requireGateApiKey, upload.single('image'), createCapture);
router.post('/raw', requireGateApiKey, rawImageUpload, createRawCapture);
router.get('/', getCaptures);
router.get('/latest', getLatestCapture);

module.exports = router;
