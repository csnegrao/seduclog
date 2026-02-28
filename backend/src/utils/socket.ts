import { Server, Socket } from 'socket.io';
import { MaterialRequest, Notification, Message } from '../types';

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

/** Returns the private room name for a user's notifications. */
export function notificationRoom(userId: string): string {
  return `notifications:${userId}`;
}

/** Returns the room name for a request message thread. */
export function messageRoom(requestId: string): string {
  return `messages:${requestId}`;
}

/**
 * Registers Socket.io event listeners for a newly connected client.
 * Drivers call "join:delivery" to subscribe to a per-order room so that
 * location updates and status changes are scoped to interested parties.
 * Authenticated clients call "join:notifications" with their userId.
 * Participants call "join:messages" with a requestId.
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

  socket.on('join:notifications', (userId: string) => {
    if (typeof userId === 'string' && userId) {
      void socket.join(notificationRoom(userId));
    }
  });

  socket.on('join:messages', (requestId: string) => {
    if (typeof requestId === 'string' && requestId) {
      void socket.join(messageRoom(requestId));
    }
  });

  socket.on('leave:messages', (requestId: string) => {
    if (typeof requestId === 'string' && requestId) {
      void socket.leave(messageRoom(requestId));
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

/** Emits a "notification:new" event to the target user's notification room. */
export function emitNotification(notification: Notification): void {
  if (io) {
    io.to(notificationRoom(notification.userId)).emit('notification:new', notification);
  }
}

/** Emits a "message:new" event to all participants in the request thread room. */
export function emitMessage(message: Message): void {
  if (io) {
    io.to(messageRoom(message.requestId)).emit('message:new', message);
  }
}
