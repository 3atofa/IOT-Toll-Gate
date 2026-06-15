const sequelize = require('../config/database');
const createGateCapture = require('./gate-capture.model');
const Gate = require('./gate.model');
const Vehicle = require('./vehicle.model');
const AllowedCard = require('./allowed-card.model');
const User = require('./user.model');
const WantedPerson = require('./wanted-person.model');
const StolenCar = require('./stolen-car.model');
const SecurityAlert = require('./security-alert.model');
const Technician = require('./technician.model');
const Incident = require('./incident.model');
const TechnicianTask = require('./technician-task.model');

const GateCapture = createGateCapture(sequelize);
const WantedPersonModel = WantedPerson(sequelize);
const StolenCarModel = StolenCar(sequelize);
const SecurityAlertModel = SecurityAlert(sequelize);

// ─── Associations ──────────────────────────────────────────────────
// Incident ↔ Technician (assigned tech)
Incident.belongsTo(Technician, { foreignKey: 'assignedTechnicianId', as: 'assignedTechnician', constraints: false });
Technician.hasMany(Incident, { foreignKey: 'assignedTechnicianId', as: 'assignedIncidents', constraints: false });

// TechnicianTask ↔ Incident
TechnicianTask.belongsTo(Incident, { foreignKey: 'incidentId', as: 'incident', constraints: false });
Incident.hasMany(TechnicianTask, { foreignKey: 'incidentId', as: 'tasks', constraints: false });

// TechnicianTask ↔ Technician
TechnicianTask.belongsTo(Technician, { foreignKey: 'technicianId', as: 'technician', constraints: false });
Technician.hasMany(TechnicianTask, { foreignKey: 'technicianId', as: 'tasks', constraints: false });

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
  Technician,
  Incident,
  TechnicianTask,
};
