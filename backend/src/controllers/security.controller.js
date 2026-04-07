const { WantedPerson, StolenCar, SecurityAlert } = require('../models');
const path = require('path');

const normalizePlate = (value) => String(value || '').toUpperCase().replace(/\s+/g, '');

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

const createWantedPerson = async (req, res, next) => {
  try {
    const fullName = String(req.body.fullName || '').trim();
    if (!fullName) {
      return res.status(400).json({ message: 'fullName is required' });
    }

    const uploadedFacePath = req.file?.path ? toPublicImageUrl(req, req.file.path) : null;
    const providedFacePath = String(req.body.faceImagePath || '').trim();
    const faceImagePath = uploadedFacePath || providedFacePath || null;

    if (!faceImagePath) {
      return res.status(400).json({ message: 'faceImage is required' });
    }

    const wantedPerson = await WantedPerson.create({
      fullName,
      faceImagePath,
      faceLabel: req.body.faceLabel || fullName,
      status: req.body.status || 'active',
      notes: req.body.notes || null,
    });

    res.status(201).json(wantedPerson);
  } catch (error) {
    next(error);
  }
};

const getWantedPersons = async (req, res, next) => {
  try {
    const items = await WantedPerson.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

const createStolenCar = async (req, res, next) => {
  try {
    const plateNumber = String(req.body.plateNumber || '').toUpperCase().trim();
    const stolenCar = await StolenCar.create({
      plateNumber,
      plateNormalized: normalizePlate(req.body.plateNormalized || plateNumber),
      vehicleType: req.body.vehicleType || null,
      status: req.body.status || 'active',
      notes: req.body.notes || null,
    });

    res.status(201).json(stolenCar);
  } catch (error) {
    next(error);
  }
};

const getStolenCars = async (req, res, next) => {
  try {
    const items = await StolenCar.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

const getSecurityAlerts = async (req, res, next) => {
  try {
    const items = await SecurityAlert.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWantedPerson,
  getWantedPersons,
  createStolenCar,
  getStolenCars,
  getSecurityAlerts,
};
