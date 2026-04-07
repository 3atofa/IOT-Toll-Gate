const jwt = require('jsonwebtoken');
const { User } = require('../models');

const extractToken = (req) => {
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }

  return req.headers['x-access-token'] ? String(req.headers['x-access-token']) : null;
};

const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured on server' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.sub, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    req.auth = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }

  return next();
};

module.exports = {
  requireAuth,
  requireRole,
};
