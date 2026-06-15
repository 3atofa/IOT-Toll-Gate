const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Gate = sequelize.define('Gate', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  token: {
    type: DataTypes.UUID,
    unique: true,
    allowNull: false,
    defaultValue: uuidv4,
    comment: 'Per-gate hardware token — embed in ESP32/Arduino firmware',
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
  pendingCommand: {
    type: DataTypes.STRING(10),
    defaultValue: 'none',
    comment: 'Command queued by web operator, consumed and cleared by ESP32 on next poll',
  },
  tollFeePerPass: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 5.00,
    comment: 'Fee charged per access_granted event at this gate',
  },
}, {
  timestamps: true,
  tableName: 'gates',
});

module.exports = Gate;
