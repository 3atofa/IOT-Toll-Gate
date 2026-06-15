const { Technician, TechnicianTask, Incident } = require('../models');
const { Op } = require('sequelize');

// GET /api/technicians
const getAll = async (req, res, next) => {
  try {
    const { search, status, specialization } = req.query;
    const where = {};
    if (status) where.status = status;
    if (specialization) where.specialization = specialization;
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { email:    { [Op.iLike]: `%${search}%` } },
        { phone:    { [Op.iLike]: `%${search}%` } },
      ];
    }
    const technicians = await Technician.findAll({
      where,
      order: [['fullName', 'ASC']],
    });
    return res.json(technicians);
  } catch (err) { return next(err); }
};

// GET /api/technicians/:id
const getById = async (req, res, next) => {
  try {
    const tech = await Technician.findByPk(req.params.id);
    if (!tech) return res.status(404).json({ error: 'Technician not found' });
    // Include recent tasks
    const tasks = await TechnicianTask.findAll({
      where: { technicianId: tech.id },
      include: [{ model: Incident, as: 'incident', attributes: ['id', 'title', 'gateId', 'severity', 'status'] }],
      order: [['assignedAt', 'DESC']],
      limit: 20,
    });
    return res.json({ ...tech.toJSON(), recentTasks: tasks });
  } catch (err) { return next(err); }
};

// POST /api/technicians
const create = async (req, res, next) => {
  try {
    const { fullName, email, phone, specialization, monthlySalary, status, hireDate, notes } = req.body;
    if (!fullName) return res.status(400).json({ error: 'fullName is required' });
    const tech = await Technician.create({ fullName, email, phone, specialization, monthlySalary, status, hireDate, notes });
    return res.status(201).json(tech);
  } catch (err) { return next(err); }
};

// PUT /api/technicians/:id
const update = async (req, res, next) => {
  try {
    const tech = await Technician.findByPk(req.params.id);
    if (!tech) return res.status(404).json({ error: 'Technician not found' });
    const { fullName, email, phone, specialization, monthlySalary, status, hireDate, notes } = req.body;
    await tech.update({ fullName, email, phone, specialization, monthlySalary, status, hireDate, notes });
    return res.json(tech);
  } catch (err) { return next(err); }
};

// DELETE /api/technicians/:id
const remove = async (req, res, next) => {
  try {
    const tech = await Technician.findByPk(req.params.id);
    if (!tech) return res.status(404).json({ error: 'Technician not found' });
    await tech.destroy();
    return res.json({ message: 'Technician deleted' });
  } catch (err) { return next(err); }
};

// GET /api/technicians/:id/tasks
const getTasks = async (req, res, next) => {
  try {
    const tasks = await TechnicianTask.findAll({
      where: { technicianId: req.params.id },
      include: [{ model: Incident, as: 'incident' }],
      order: [['assignedAt', 'DESC']],
    });
    return res.json(tasks);
  } catch (err) { return next(err); }
};

module.exports = { getAll, getById, create, update, remove, getTasks };
