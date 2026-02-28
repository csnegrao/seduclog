import { Server, Socket } from 'socket.io';
import { MaterialRequest } from '../types';

/**
 * Module-level Socket.io server instance.
 * Null when running in tests or when the socket server has not been attached.
 */
let io: Server | null = null;

export function setSocketServer(socketServer: Server): void {
  io = socketServer;
}

/** Returns the room name for a delivery order. */
export function deliveryRoom(orderId: string): string {
  return `delivery:${orderId}`;
}

/**
 * Registers Socket.io event listeners for a newly connected client.
 * Drivers call "join:delivery" to subscribe to a per-order room so that
 * location updates and status changes are scoped to interested parties.
 */
export function registerSocketHandlers(socket: Socket): void {
  socket.on('join:delivery', (orderId: string) => {
    if (typeof orderId === 'string' && orderId) {
      void socket.join(deliveryRoom(orderId));
    }
  });

  socket.on('leave:delivery', (orderId: string) => {
    if (typeof orderId === 'string' && orderId) {
      void socket.leave(deliveryRoom(orderId));
    }
  });
}

/** Emits the "request:updated" event to all connected clients. No-op when io is null. */
export function emitRequestUpdated(request: MaterialRequest): void {
  if (io) {
    io.emit('request:updated', request);
  }
}

/**
 * Emits the "driver:location" event.
 * When the order has an active room (driver joined via "join:delivery"), the
 * event is scoped to that room; otherwise it falls back to a global broadcast.
 */
export function emitDriverLocation(payload: {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  eta?: number;
}): void {
  if (io) {
    io.to(deliveryRoom(payload.orderId)).emit('driver:location', payload);
  }
}

/** Emits the "delivery:confirmed" event to the delivery room. */
export function emitDeliveryConfirmed(payload: { orderId: string; requestId: string }): void {
  if (io) {
    io.to(deliveryRoom(payload.orderId)).emit('delivery:confirmed', payload);
  }
}
