const { Incident, Technician, TechnicianTask } = require('../models');
const { Op } = require('sequelize');

// GET /api/incidents
const getAll = async (req, res, next) => {
  try {
    const { status, severity, gateId, search } = req.query;
    const where = {};
    if (status)   where.status   = status;
    if (severity) where.severity = severity;
    if (gateId)   where.gateId   = gateId;
    if (search) {
      where[Op.or] = [
        { title:       { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { gateId:      { [Op.iLike]: `%${search}%` } },
      ];
    }
    const incidents = await Incident.findAll({
      where,
      include: [{ model: Technician, as: 'assignedTechnician', attributes: ['id', 'fullName', 'specialization', 'phone'] }],
      order: [['reportedAt', 'DESC']],
    });
    return res.json(incidents);
  } catch (err) { return next(err); }
};

// GET /api/incidents/:id
const getById = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      include: [
        { model: Technician, as: 'assignedTechnician' },
        {
          model: TechnicianTask,
          as: 'tasks',
          include: [{ model: Technician, as: 'technician', attributes: ['id', 'fullName', 'specialization', 'phone'] }],
        },
      ],
    });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    return res.json(incident);
  } catch (err) { return next(err); }
};

// POST /api/incidents
const create = async (req, res, next) => {
  try {
    const { title, description, gateId, severity, status, reportedBy, repairCost, assignedTechnicianId } = req.body;
    if (!title)  return res.status(400).json({ error: 'title is required' });
    if (!gateId) return res.status(400).json({ error: 'gateId is required' });
    const incident = await Incident.create({
      title, description, gateId, severity, status, reportedBy, repairCost, assignedTechnicianId,
    });
    // Auto-create a technician task if a technician is assigned at creation
    if (assignedTechnicianId) {
      await TechnicianTask.create({ incidentId: incident.id, technicianId: assignedTechnicianId });
    }
    return res.status(201).json(incident);
  } catch (err) { return next(err); }
};

// PUT /api/incidents/:id
const update = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { title, description, gateId, severity, status, resolutionNotes, repairCost, reportedBy, assignedTechnicianId } = req.body;

    // Auto-set resolvedAt when transitioning to resolved
    let resolvedAt = incident.resolvedAt;
    if (status === 'resolved' && incident.status !== 'resolved') {
      resolvedAt = new Date();
    }
    if (status && status !== 'resolved') {
      resolvedAt = null;
    }

    await incident.update({
      title, description, gateId, severity, status, resolutionNotes, repairCost, reportedBy, assignedTechnicianId, resolvedAt,
    });

    return res.json(incident);
  } catch (err) { return next(err); }
};

// DELETE /api/incidents/:id
const remove = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    await incident.destroy();
    return res.json({ message: 'Incident deleted' });
  } catch (err) { return next(err); }
};

// POST /api/incidents/:id/assign
const assign = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { technicianId, notes } = req.body;
    if (!technicianId) return res.status(400).json({ error: 'technicianId is required' });

    const tech = await Technician.findByPk(technicianId);
    if (!tech) return res.status(404).json({ error: 'Technician not found' });

    // Check if task already exists for this tech+incident
    const existing = await TechnicianTask.findOne({ where: { incidentId: incident.id, technicianId } });
    if (existing) return res.status(409).json({ error: 'Technician already assigned to this incident' });

    const task = await TechnicianTask.create({ incidentId: incident.id, technicianId, notes });

    // Update incident's assigned technician + move to in_progress
    await incident.update({
      assignedTechnicianId: technicianId,
      status: incident.status === 'open' ? 'in_progress' : incident.status,
    });

    return res.status(201).json({ task, incident });
  } catch (err) { return next(err); }
};

// PUT /api/incidents/:incidentId/tasks/:taskId
const updateTask = async (req, res, next) => {
  try {
    const task = await TechnicianTask.findOne({
      where: { id: req.params.taskId, incidentId: req.params.incidentId },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { status, notes } = req.body;
    let completedAt = task.completedAt;
    if (status === 'completed' && task.status !== 'completed') {
      completedAt = new Date();
    }
    await task.update({ status, notes, completedAt });
    return res.json(task);
  } catch (err) { return next(err); }
};

module.exports = { getAll, getById, create, update, remove, assign, updateTask };
