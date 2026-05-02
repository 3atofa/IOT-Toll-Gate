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
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'JWT_SECRET is not configured on server' });
  }

  // Verify JWT signature / expiry separately so we get a precise error
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (jwtError) {
    // Log so it appears in PM2 / server logs for diagnosis
    console.error('[requireAuth] jwt.verify failed:', jwtError.name, jwtError.message);
    return res.status(401).json({ message: 'Invalid or expired token', reason: jwtError.message });
  }

  // Look up user — wrap DB errors so they don't masquerade as auth failures
  try {
    const user = await User.findByPk(decoded.sub, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    req.auth = decoded;
    return next();
  } catch (dbError) {
    console.error('[requireAuth] DB error during user lookup:', dbError.message);
    return next(dbError); // let the global error handler return 500
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
