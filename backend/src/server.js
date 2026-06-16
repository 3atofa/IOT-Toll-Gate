const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const { DataTypes, QueryTypes } = require('sequelize');
const app = require('./app');
const { sequelize, User } = require('./models');
const { initSocket } = require('./services/socket.service');

// ---------------------------------------------------------------------------
// Safe schema sync — adds missing columns without touching existing ones.
// Sequelize alter:true generates invalid SQL for columns with unique+default,
// so we do it manually. Add a row here whenever a new column is added to an
// existing model AFTER the table was first created in production.
// ---------------------------------------------------------------------------
const PENDING_COLUMNS = [
  // gates table (camelCase — Gate model has no underscored:true)
  ['gates', 'pendingCommand',    { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'none' }],
  ['gates', 'tollFeePerPass',    { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 5.00 }],
  // incidents table (camelCase — Incident model has no underscored:true)
  ['incidents', 'reportedBy',       { type: DataTypes.STRING, allowNull: true }],
  ['incidents', 'repairCost',       { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0.00 }],
  ['incidents', 'resolutionNotes',  { type: DataTypes.TEXT, allowNull: true }],
];

const syncSafe = async () => {
  // Create any brand-new tables; leave existing tables untouched.
  await sequelize.sync({ alter: false, force: false });

  const qi = sequelize.getQueryInterface();
  for (const [table, column, def] of PENDING_COLUMNS) {
    const rows = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = :table AND column_name = :column`,
      { replacements: { table, column }, type: QueryTypes.SELECT }
    );
    if (rows.length === 0) {
      await qi.addColumn(table, column, def);
      console.log(`  ✓ added column ${table}.${column}`);
    }
  }
};

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

  if (shouldForceSync) {
    await sequelize.sync({ force: true });
  } else {
    await syncSafe();
  }

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
