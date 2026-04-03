const express = require('express');
const cardController = require('../controllers/allowed-card.controller');

const router = express.Router();

router.post('/', cardController.createAllowedCard);
router.get('/', cardController.getAllowedCards);
router.post('/verify', cardController.verifyCard);
router.get('/:id', cardController.getAllowedCardById);
router.put('/:id', cardController.updateAllowedCard);
router.patch('/:id/toggle', cardController.toggleCardStatus);
router.delete('/:id', cardController.deleteAllowedCard);

module.exports = router;
