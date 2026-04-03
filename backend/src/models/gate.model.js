const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Gate = sequelize.define('Gate', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  gateId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    defaultValue: 'gate-1',
  },
  gateNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Main Entry',
  },
  status: {
    type: DataTypes.ENUM('open', 'closed', 'error'),
    defaultValue: 'closed',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastCommand: {
    type: DataTypes.ENUM('open', 'close', 'none'),
    defaultValue: 'none',
  },
  lastCommandAt: {
    type: DataTypes.DATE,
  },
  commandedBy: {
    type: DataTypes.STRING,
    defaultValue: 'system',
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  timestamps: true,
  tableName: 'gates',
});

module.exports = Gate;
