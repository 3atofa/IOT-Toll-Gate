let io;

const initSocket = (socketServer) => {
  io = socketServer;
  return io;
};

const getSocket = () => io;

module.exports = {
  initSocket,
  getSocket,
};
