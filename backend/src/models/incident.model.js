const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Incident = sequelize.define('Incident', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Detailed description of what happened',
  },
  gateId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'The gate string ID (e.g. gate-1) where the crash occurred',
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved'),
    defaultValue: 'open',
  },
  reportedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolutionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'What was done to fix the issue',
  },
  repairCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
    comment: 'Repair/parts cost in local currency',
  },
  reportedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Name or ID of the person who reported the incident',
  },
  assignedTechnicianId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK to technicians.id',
  },
}, {
  timestamps: true,
  tableName: 'incidents',
});

module.exports = Incident;
