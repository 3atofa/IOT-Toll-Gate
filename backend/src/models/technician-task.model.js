const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TechnicianTask = sequelize.define('TechnicianTask', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  incidentId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'FK to incidents.id',
  },
  technicianId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'FK to technicians.id',
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },
  assignedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'technician_tasks',
});

module.exports = TechnicianTask;
