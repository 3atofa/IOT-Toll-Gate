const requireGateApiKey = (req, res, next) => {
  const expected = process.env.GATE_API_KEY;

  if (!expected) {
    return res.status(500).json({ message: 'GATE_API_KEY is not configured on server' });
  }

  const provided = req.header('X-Gate-Key');

  if (!provided || provided !== expected) {
    return res.status(401).json({ message: 'Invalid gate API key' });
  }

  return next();
};

module.exports = {
  requireGateApiKey,
};
