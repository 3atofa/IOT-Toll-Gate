const { WantedPerson, StolenCar, SecurityAlert } = require('../models');

const normalizePlate = (value) => String(value || '').toUpperCase().replace(/\s+/g, '');

const createWantedPerson = async (req, res, next) => {
  try {
    const wantedPerson = await WantedPerson.create({
      fullName: req.body.fullName,
      faceImagePath: req.body.faceImagePath || null,
      faceLabel: req.body.faceLabel || req.body.fullName,
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
