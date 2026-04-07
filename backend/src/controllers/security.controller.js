const fs = require('fs/promises');
const { WantedPerson, StolenCar, SecurityAlert } = require('../models');
const path = require('path');

const normalizePlate = (value) => String(value || '').toUpperCase().replace(/\s+/g, '');

const getAbsoluteUploadPath = (imageUrl) => {
  const raw = String(imageUrl || '').trim();
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw, 'http://localhost');
    const pathname = url.pathname || raw;
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    if (pathname.includes('/uploads/')) {
      return path.join(uploadsRoot, pathname.split('/uploads/')[1]);
    }
  } catch {
    // fall back to relative path handling below
  }

  if (raw.includes('/uploads/')) {
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    return path.join(uploadsRoot, raw.split('/uploads/')[1]);
  }

  return null;
};

const removeUploadIfExists = async (imageUrl) => {
  const absolutePath = getAbsoluteUploadPath(imageUrl);
  if (!absolutePath) return;

  try {
    await fs.unlink(absolutePath);
  } catch {
    // ignore missing file
  }
};

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

const updateWantedPerson = async (req, res, next) => {
  try {
    const item = await WantedPerson.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Wanted person not found' });
    }

    const fullName = String(req.body.fullName || item.fullName || '').trim();
    if (!fullName) {
      return res.status(400).json({ message: 'fullName is required' });
    }

    const uploadedFacePath = req.file?.path ? toPublicImageUrl(req, req.file.path) : null;
    const providedFacePath = String(req.body.faceImagePath || '').trim();
    const faceImagePath = uploadedFacePath || providedFacePath || item.faceImagePath;

    if (!faceImagePath) {
      return res.status(400).json({ message: 'faceImage is required' });
    }

    const oldFaceImagePath = item.faceImagePath;

    await item.update({
      fullName,
      faceImagePath,
      faceLabel: req.body.faceLabel || fullName,
      status: req.body.status || item.status,
      notes: req.body.notes ?? item.notes,
    });

    if (uploadedFacePath && oldFaceImagePath && oldFaceImagePath !== faceImagePath) {
      await removeUploadIfExists(oldFaceImagePath);
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
};

const deleteWantedPerson = async (req, res, next) => {
  try {
    const item = await WantedPerson.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Wanted person not found' });
    }

    const faceImagePath = item.faceImagePath;
    await item.destroy();
    await removeUploadIfExists(faceImagePath);

    res.json({ message: 'Wanted person deleted successfully' });
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

const updateStolenCar = async (req, res, next) => {
  try {
    const item = await StolenCar.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Stolen car not found' });
    }

    const plateNumber = String(req.body.plateNumber || item.plateNumber || '').toUpperCase().trim();
    if (!plateNumber) {
      return res.status(400).json({ message: 'plateNumber is required' });
    }

    await item.update({
      plateNumber,
      plateNormalized: normalizePlate(req.body.plateNormalized || plateNumber),
      vehicleType: req.body.vehicleType ?? item.vehicleType,
      status: req.body.status || item.status,
      notes: req.body.notes ?? item.notes,
    });

    res.json(item);
  } catch (error) {
    next(error);
  }
};

const deleteStolenCar = async (req, res, next) => {
  try {
    const item = await StolenCar.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Stolen car not found' });
    }

    await item.destroy();
    res.json({ message: 'Stolen car deleted successfully' });
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
  updateWantedPerson,
  deleteWantedPerson,
  createStolenCar,
  getStolenCars,
  updateStolenCar,
  deleteStolenCar,
  getSecurityAlerts,
};
