const { AllowedCard } = require('../models');

const createAllowedCard = async (req, res, next) => {
  try {
    const { cardUID, cardHolder, cardType, department, expiryDate, notes } = req.body;

    const card = await AllowedCard.create({
      cardUID: cardUID?.toUpperCase(),
      cardHolder,
      cardType: cardType || 'visitor',
      department,
      expiryDate,
      notes,
    });

    res.status(201).json(card);
  } catch (error) {
    next(error);
  }
};

const getAllowedCards = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, cardType, isActive } = req.query;

    const where = {};
    if (cardType) where.cardType = cardType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const { count, rows } = await AllowedCard.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: count,
      count: rows.length,
      offset: parseInt(offset),
      limit: parseInt(limit),
      cards: rows,
    });
  } catch (error) {
    next(error);
  }
};

const getAllowedCardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const card = await AllowedCard.findByPk(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.json(card);
  } catch (error) {
    next(error);
  }
};

const updateAllowedCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cardHolder, cardType, isActive, department, expiryDate, notes } = req.body;

    const card = await AllowedCard.findByPk(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    if (cardHolder) card.cardHolder = cardHolder;
    if (cardType) card.cardType = cardType;
    if (isActive !== undefined) card.isActive = isActive;
    if (department) card.department = department;
    if (expiryDate) card.expiryDate = expiryDate;
    if (notes) card.notes = notes;

    await card.save();
    res.json(card);
  } catch (error) {
    next(error);
  }
};

const toggleCardStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const card = await AllowedCard.findByPk(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    card.isActive = !card.isActive;
    await card.save();

    res.json({ message: `Card ${card.isActive ? 'activated' : 'deactivated'}`, card });
  } catch (error) {
    next(error);
  }
};

const deleteAllowedCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const card = await AllowedCard.findByPk(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    await card.destroy();
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const verifyCard = async (req, res, next) => {
  try {
    const { cardUID } = req.body;
    const card = await AllowedCard.findOne({ where: { cardUID: cardUID?.toUpperCase() } });

    if (!card) {
      return res.json({ allowed: false, message: 'Card not found' });
    }

    if (!card.isActive) {
      return res.json({ allowed: false, message: 'Card is not active' });
    }

    if (card.expiryDate && new Date() > new Date(card.expiryDate)) {
      return res.json({ allowed: false, message: 'Card has expired' });
    }

    res.json({
      allowed: true,
      card: {
        cardUID: card.cardUID,
        cardHolder: card.cardHolder,
        cardType: card.cardType,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAllowedCard,
  getAllowedCards,
  getAllowedCardById,
  updateAllowedCard,
  toggleCardStatus,
  deleteAllowedCard,
  verifyCard,
};
