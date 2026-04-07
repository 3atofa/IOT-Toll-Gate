const express = require('express');
const { login, me, listUsers, createUser } = require('../controllers/auth.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, me);
router.get('/users', requireAuth, requireRole('admin'), listUsers);
router.post('/users', requireAuth, requireRole('admin'), createUser);

module.exports = router;
