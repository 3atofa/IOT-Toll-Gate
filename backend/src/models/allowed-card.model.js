const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AllowedCard = sequelize.define('AllowedCard', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  cardUID: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  cardHolder: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cardType: {
    type: DataTypes.ENUM('employee', 'visitor', 'vehicle', 'admin'),
    defaultValue: 'visitor',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  expiryDate: {
    type: DataTypes.DATE,
  },
  department: {
    type: DataTypes.STRING,
  },
  assignedDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  timestamps: true,
  tableName: 'allowed_cards',
});

module.exports = AllowedCard;
