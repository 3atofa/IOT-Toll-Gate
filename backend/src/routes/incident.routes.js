const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/incident.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);

router.get('/',                                  ctrl.getAll);
router.get('/:id',                               ctrl.getById);
router.post('/',                                 ctrl.create);
router.put('/:id',                               ctrl.update);
router.delete('/:id',                            ctrl.remove);
router.post('/:id/assign',                       ctrl.assign);
router.put('/:incidentId/tasks/:taskId',         ctrl.updateTask);

module.exports = router;
