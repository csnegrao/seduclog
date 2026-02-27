const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

/**
 * Attaches a Socket.io server to the given HTTP server.
 * Each authenticated user joins a personal room `user:<id>`.
 * Clients can also join a request room `request:<id>` by emitting `join:request`.
 */
function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    // Each user automatically joins their personal room
    socket.join(`user:${userId}`);

    // Allow clients to subscribe to a specific request thread
    socket.on('join:request', (requestId) => {
      if (requestId) socket.join(`request:${requestId}`);
    });

    socket.on('leave:request', (requestId) => {
      if (requestId) socket.leave(`request:${requestId}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

module.exports = setupSocket;
