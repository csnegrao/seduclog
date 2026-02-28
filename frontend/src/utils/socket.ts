import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_BASE ?? 'http://localhost:3001';

/**
 * Shared Socket.io client instance.
 * Lazily connects on first import and reuses the same connection
 * throughout the app lifetime.
 */
let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SOCKET_URL, { transports: ['websocket'] });
  }
  return _socket;
}
