const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  licensePlate: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Vehicle license plate or identifier',
  },
  vehicleType: {
    type: DataTypes.ENUM('car', 'truck', 'bus', 'motorcycle', 'other'),
    defaultValue: 'car',
  },
  ownerName: {
    type: DataTypes.STRING,
  },
  ownerContact: {
    type: DataTypes.STRING,
  },
  cardUIDs: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of RFID card UIDs associated with this vehicle',
  },
  lastPassageAt: {
    type: DataTypes.DATE,
  },
  passageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('allowed', 'blocked', 'pending'),
    defaultValue: 'allowed',
  },
  notes: {
    type: DataTypes.TEXT,
  },
  registrationExpiry: {
    type: DataTypes.DATE,
  },
}, {
  timestamps: true,
  tableName: 'vehicles',
});

module.exports = Vehicle;
