import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

let socket = null;

/**
 * Get or create the Socket.io connection.
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });
  }
  return socket;
}

/**
 * Disconnect and reset the socket.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Join a delivery room as a requester.
 * @param {string} deliveryOrderId
 */
export function joinDeliveryAsRequester(deliveryOrderId) {
  getSocket().emit('requester:join', { deliveryOrderId });
}

/**
 * Join a delivery room as a driver.
 * @param {string} deliveryOrderId
 * @param {string} driverId
 * @param {{ lat: number, lng: number }} destination
 */
export function joinDeliveryAsDriver(deliveryOrderId, driverId, destination) {
  getSocket().emit('driver:join', { deliveryOrderId, driverId, destination });
}

/**
 * Emit a driver location update.
 * @param {string} deliveryOrderId
 * @param {number} lat
 * @param {number} lng
 * @param {number} eta
 */
export function emitDriverLocation(deliveryOrderId, lat, lng, eta) {
  getSocket().emit('driver:location', { deliveryOrderId, lat, lng, eta });
}

/**
 * Emit a driver status update.
 * @param {string} deliveryOrderId
 * @param {string} status
 */
export function emitDriverStatus(deliveryOrderId, status) {
  getSocket().emit('driver:status', { deliveryOrderId, status });
}
