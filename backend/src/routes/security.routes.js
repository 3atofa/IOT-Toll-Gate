const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
  createWantedPerson,
  getWantedPersons,
  updateWantedPerson,
  deleteWantedPerson,
  createStolenCar,
  getStolenCars,
  updateStolenCar,
  deleteStolenCar,
  getSecurityAlerts,
} = require('../controllers/security.controller');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'wanted-persons');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    const safeName = String(req.body?.fullName || 'wanted_person')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const base = `${safeName || 'wanted_person'}_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.get('/wanted-persons', getWantedPersons);
router.post('/wanted-persons', upload.single('faceImage'), createWantedPerson);
router.put('/wanted-persons/:id', upload.single('faceImage'), updateWantedPerson);
router.delete('/wanted-persons/:id', deleteWantedPerson);
router.get('/stolen-cars', getStolenCars);
router.post('/stolen-cars', createStolenCar);
router.put('/stolen-cars/:id', updateStolenCar);
router.delete('/stolen-cars/:id', deleteStolenCar);
router.get('/alerts', getSecurityAlerts);

module.exports = router;
