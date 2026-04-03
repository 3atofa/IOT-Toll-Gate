const sequelize = require('../config/database');
const createGateCapture = require('./gate-capture.model');
const Gate = require('./gate.model');
const Vehicle = require('./vehicle.model');
const AllowedCard = require('./allowed-card.model');

const GateCapture = createGateCapture(sequelize);

// Define associations (without constraints to avoid schema conflicts)
// GateCapture uses gateId as a string identifier, not a foreign key
// Vehicle.hasMany(GateCapture, { foreignKey: 'vehicleId', onDelete: 'SET NULL' });
// GateCapture.belongsTo(Vehicle, { foreignKey: 'vehicleId' });

module.exports = {
  sequelize,
  GateCapture,
  Gate,
  Vehicle,
  AllowedCard,
};
