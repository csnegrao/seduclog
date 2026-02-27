import { Server } from 'socket.io';

let io: Server | null = null;

export function initSocket(server: import('http').Server): Server {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join:order', (orderId: string) => {
      void socket.join(`order:${orderId}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}
