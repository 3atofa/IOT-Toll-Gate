const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');

const router = express.Router();

router.post('/', vehicleController.createVehicle);
router.get('/stats', vehicleController.getVehicleStats);
router.get('/', vehicleController.getVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.put('/:id', vehicleController.updateVehicle);
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;
