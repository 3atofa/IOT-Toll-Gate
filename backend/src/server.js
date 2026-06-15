const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const app = require('./app');
const { sequelize, User } = require('./models');
const { initSocket } = require('./services/socket.service');

const ensureUploadsDir = () => {
  const dir = path.join(process.cwd(), 'uploads', 'gate');
  fs.mkdirSync(dir, { recursive: true });
};

const bootstrap = async () => {
  ensureUploadsDir();

  // Create database if it doesn't exist
  await sequelize.createDatabaseIfNotExists();

  await sequelize.authenticate();
  const shouldForceSync = String(process.env.DB_SYNC_FORCE || 'false').toLowerCase() === 'true';
  if (shouldForceSync) {
    console.warn('WARNING: DB_SYNC_FORCE=true, syncing with force will drop and recreate tables.');
  }

  await sequelize.sync({
    alter: false,
    force: shouldForceSync,
  });

  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');
  const adminName = String(process.env.ADMIN_NAME || 'Admin').trim();

  if (adminEmail && adminPassword) {
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await User.create({
        fullName: adminName,
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isActive: true,
      });
      console.log(`Seeded default admin user: ${adminEmail}`);
    }
  }

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  initSocket(io);

  io.on('connection', (socket) => {
    socket.emit('connected', { message: 'Socket connected' });
  });

  const port = Number(process.env.PORT || 5000);
  server.listen(port, () => {
    console.log(`API running on port ${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
