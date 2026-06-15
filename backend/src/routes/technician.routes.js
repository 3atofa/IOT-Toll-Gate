const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/technician.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);

router.get('/',         ctrl.getAll);
router.get('/:id',      ctrl.getById);
router.post('/',        ctrl.create);
router.put('/:id',      ctrl.update);
router.delete('/:id',   ctrl.remove);
router.get('/:id/tasks', ctrl.getTasks);

module.exports = router;
