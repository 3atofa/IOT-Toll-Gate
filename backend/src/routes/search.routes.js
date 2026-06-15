const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/search.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/', requireAuth, globalSearch);

module.exports = router;
