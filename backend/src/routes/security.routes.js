const express = require('express');
const {
  createWantedPerson,
  getWantedPersons,
  createStolenCar,
  getStolenCars,
  getSecurityAlerts,
} = require('../controllers/security.controller');

const router = express.Router();

router.get('/wanted-persons', getWantedPersons);
router.post('/wanted-persons', createWantedPerson);
router.get('/stolen-cars', getStolenCars);
router.post('/stolen-cars', createStolenCar);
router.get('/alerts', getSecurityAlerts);

module.exports = router;
