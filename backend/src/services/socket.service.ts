import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      (socket as Socket & { user?: JwtPayload }).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { user?: JwtPayload }).user;
    console.log(`Socket connected: ${user?.email} (${user?.role})`);

    // Join role-based rooms
    if (user) {
      socket.join(`role:${user.role}`);
      socket.join(`user:${user.userId}`);
    }

    // Driver location updates
    socket.on('driver:location', (data: { lat: number; lng: number; deliveryId: string }) => {
      socket.broadcast.emit('driver:location', {
        driverId: user?.userId,
        ...data,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user?.email}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
