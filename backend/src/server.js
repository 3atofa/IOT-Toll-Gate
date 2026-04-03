const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { sequelize } = require('./models');
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
  await sequelize.sync({
    alter: false,
    force: process.env.NODE_ENV === 'development'
      ? true
      : String(process.env.DB_SYNC_FORCE).toLowerCase() === 'true',
  });

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
