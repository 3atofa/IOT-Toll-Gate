const { Op } = require('sequelize');
const { GateCapture, Vehicle, Incident, Technician } = require('../models');

// GET /api/search?q=term&types=captures,vehicles,incidents,technicians&limit=10
const globalSearch = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ results: [], query: q });

    const types = req.query.types
      ? req.query.types.split(',')
      : ['captures', 'vehicles', 'incidents', 'technicians'];
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const results = {};

    if (types.includes('captures')) {
      const captures = await GateCapture.findAll({
        where: {
          [Op.or]: [
            { plateText: { [Op.iLike]: `%${q}%` } },
            { faceName:  { [Op.iLike]: `%${q}%` } },
            { gateId:    { [Op.iLike]: `%${q}%` } },
            { cardUid:   { [Op.iLike]: `%${q}%` } },
          ],
        },
        order: [['capturedAt', 'DESC']],
        limit,
        attributes: ['id', 'gateId', 'eventType', 'plateText', 'faceName', 'cardUid', 'ocrStatus', 'capturedAt'],
      });
      results.captures = captures;
    }

    if (types.includes('vehicles')) {
      const vehicles = await Vehicle.findAll({
        where: {
          [Op.or]: [
            { plateNumber:   { [Op.iLike]: `%${q}%` } },
            { ownerName:     { [Op.iLike]: `%${q}%` } },
            { ownerPhone:    { [Op.iLike]: `%${q}%` } },
            { vehicleType:   { [Op.iLike]: `%${q}%` } },
          ],
        },
        limit,
      });
      results.vehicles = vehicles;
    }

    if (types.includes('incidents')) {
      const incidents = await Incident.findAll({
        where: {
          [Op.or]: [
            { title:       { [Op.iLike]: `%${q}%` } },
            { description: { [Op.iLike]: `%${q}%` } },
            { gateId:      { [Op.iLike]: `%${q}%` } },
            { reportedBy:  { [Op.iLike]: `%${q}%` } },
          ],
        },
        order: [['reportedAt', 'DESC']],
        limit,
        attributes: ['id', 'title', 'gateId', 'severity', 'status', 'reportedAt', 'reportedBy', 'repairCost'],
      });
      results.incidents = incidents;
    }

    if (types.includes('technicians')) {
      const technicians = await Technician.findAll({
        where: {
          [Op.or]: [
            { fullName:       { [Op.iLike]: `%${q}%` } },
            { email:          { [Op.iLike]: `%${q}%` } },
            { phone:          { [Op.iLike]: `%${q}%` } },
            { specialization: { [Op.iLike]: `%${q}%` } },
          ],
        },
        limit,
        attributes: ['id', 'fullName', 'email', 'phone', 'specialization', 'status', 'monthlySalary'],
      });
      results.technicians = technicians;
    }

    return res.json({ query: q, results });
  } catch (err) { return next(err); }
};

module.exports = { globalSearch };
