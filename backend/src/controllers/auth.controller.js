const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');

// ── Per-IP brute-force protection ─────────────────────────────────────────────
const _loginAttempts = new Map(); // ip → { count, resetAt, blockedUntil }
const MAX_FAILS    = 5;
const WINDOW_MS    = 10 * 60 * 1000; // 10-min rolling window
const LOCKOUT_MS   = 15 * 60 * 1000; // 15-min lockout after MAX_FAILS

const _getIp = (req) => {
  const fwd = req.headers['x-forwarded-for'];
  return fwd ? String(fwd).split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || 'unknown');
};

const _checkRateLimit = (req, res) => {
  const ip  = _getIp(req);
  const now = Date.now();
  const r   = _loginAttempts.get(ip);

  if (r?.blockedUntil && now < r.blockedUntil) {
    const secs = Math.ceil((r.blockedUntil - now) / 1000);
    res.status(429).json({
      message: `Too many failed login attempts. Try again in ${Math.ceil(secs / 60)} minute(s).`,
      retryAfterSeconds: secs,
    });
    return false;
  }
  return true;
};

const _recordFail = (req) => {
  const ip  = _getIp(req);
  const now = Date.now();
  let r = _loginAttempts.get(ip);

  if (!r || now > r.resetAt) {
    r = { count: 0, resetAt: now + WINDOW_MS, blockedUntil: null };
  }
  r.count += 1;
  if (r.count >= MAX_FAILS) r.blockedUntil = now + LOCKOUT_MS;
  _loginAttempts.set(ip, r);
};

const _clearFails = (req) => { _loginAttempts.delete(_getIp(req)); };

// Purge expired entries every hour to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of _loginAttempts) {
    if (now > r.resetAt && (!r.blockedUntil || now > r.blockedUntil)) {
      _loginAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000);

const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const signToken = (user) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { subject: user.id, expiresIn }
  );
};

const login = async (req, res, next) => {
  if (!_checkRateLimit(req, res)) return;

  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({
      where: { email: { [Op.eq]: email } },
    });

    if (!user || !user.isActive) {
      _recordFail(req);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      _recordFail(req);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    _clearFails(req);
    await user.update({ lastLoginAt: new Date() });
    const token = signToken(user);

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
};

const listUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({ order: [['createdAt', 'DESC']] });
    return res.json(users.map(sanitizeUser));
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const fullName = String(req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = ['admin', 'operator', 'reviewer'].includes(req.body.role) ? req.body.role : 'operator';

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email, and password are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role,
      isActive: req.body.isActive !== false,
    });

    return res.status(201).json(sanitizeUser(user));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  me,
  listUsers,
  createUser,
};
