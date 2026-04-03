const { Vehicle, GateCapture } = require('../models');

const createVehicle = async (req, res, next) => {
  try {
    const { licensePlate, vehicleType, ownerName, ownerContact, cardUIDs, notes } = req.body;

    const vehicle = await Vehicle.create({
      licensePlate: licensePlate?.toUpperCase(),
      vehicleType: vehicleType || 'car',
      ownerName,
      ownerContact,
      cardUIDs: cardUIDs || [],
      notes,
    });

    res.status(201).json(vehicle);
  } catch (error) {
    next(error);
  }
};

const getVehicles = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, search, status } = req.query;

    const where = {};
    if (search) {
      where.licensePlate = { [require('sequelize').Op.iLike]: `%${search}%` };
    }
    if (status) {
      where.status = status;
    }

    const { count, rows } = await Vehicle.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['lastPassageAt', 'DESC']],
    });

    res.json({
      total: count,
      count: rows.length,
      offset: parseInt(offset),
      limit: parseInt(limit),
      vehicles: rows,
    });
  } catch (error) {
    next(error);
  }
};

const getVehicleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findByPk(id, {
      include: [
        {
          model: GateCapture,
          limit: 20,
          order: [['capturedAt', 'DESC']],
        },
      ],
    });

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ownerName, ownerContact, status, notes, registrationExpiry, cardUIDs } = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    if (ownerName) vehicle.ownerName = ownerName;
    if (ownerContact) vehicle.ownerContact = ownerContact;
    if (status) vehicle.status = status;
    if (notes) vehicle.notes = notes;
    if (registrationExpiry) vehicle.registrationExpiry = registrationExpiry;
    if (cardUIDs) vehicle.cardUIDs = cardUIDs;

    await vehicle.save();
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    await vehicle.destroy();
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getVehicleStats = async (req, res, next) => {
  try {
    const { period = 'day' } = req.query;

    let whereDate = {};
    const now = new Date();

    if (period === 'day') {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      whereDate = { lastPassageAt: { [require('sequelize').Op.gte]: dayStart } };
    } else if (period === 'week') {
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      whereDate = { lastPassageAt: { [require('sequelize').Op.gte]: weekStart } };
    } else if (period === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      whereDate = { lastPassageAt: { [require('sequelize').Op.gte]: monthStart } };
    }

    const stats = {
      totalVehicles: await Vehicle.count(),
      activeVehicles: await Vehicle.count({ where: { status: 'allowed' } }),
      blockedVehicles: await Vehicle.count({ where: { status: 'blocked' } }),
      passagesInPeriod: await Vehicle.count({ where: whereDate }),
      byType: await Vehicle.findAll({
        attributes: ['vehicleType', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
        group: ['vehicleType'],
        raw: true,
      }),
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getVehicleStats,
};
