import { Server } from 'socket.io';
import { MaterialRequest } from '../types';

/**
 * Module-level Socket.io server instance.
 * Null when running in tests or when the socket server has not been attached.
 */
let io: Server | null = null;

export function setSocketServer(socketServer: Server): void {
  io = socketServer;
}

/** Emits the "request:updated" event to all connected clients. No-op when io is null. */
export function emitRequestUpdated(request: MaterialRequest): void {
  if (io) {
    io.emit('request:updated', request);
  }
}
