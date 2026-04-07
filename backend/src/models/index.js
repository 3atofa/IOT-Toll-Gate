const sequelize = require('../config/database');
const createGateCapture = require('./gate-capture.model');
const Gate = require('./gate.model');
const Vehicle = require('./vehicle.model');
const AllowedCard = require('./allowed-card.model');
const User = require('./user.model');
const WantedPerson = require('./wanted-person.model');
const StolenCar = require('./stolen-car.model');
const SecurityAlert = require('./security-alert.model');

const GateCapture = createGateCapture(sequelize);
const createWantedPerson = WantedPerson;
const createStolenCar = StolenCar;
const createSecurityAlert = SecurityAlert;

const WantedPersonModel = createWantedPerson(sequelize);
const StolenCarModel = createStolenCar(sequelize);
const SecurityAlertModel = createSecurityAlert(sequelize);

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
  User,
  WantedPerson: WantedPersonModel,
  StolenCar: StolenCarModel,
  SecurityAlert: SecurityAlertModel,
};
