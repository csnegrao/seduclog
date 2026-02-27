const { Server } = require('socket.io');
const { getDelivery, updateDelivery } = require('./store');
const { sendStatusNotification } = require('./routes/notifications');

let io;

/**
 * Initialize Socket.io server.
 * @param {import('http').Server} httpServer
 */
function initSocket(httpServer) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  io = new Server(httpServer, {
    cors: {
      origin: frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    /**
     * Driver joins a delivery room.
     * Payload: { deliveryOrderId, driverId, destination }
     */
    socket.on('driver:join', ({ deliveryOrderId, driverId, destination }) => {
      const room = `delivery:${deliveryOrderId}`;
      socket.join(room);

      updateDelivery(deliveryOrderId, { driverId, destination: destination || null });

      socket.deliveryOrderId = deliveryOrderId;
      socket.role = 'driver';

      io.to(room).emit('delivery:updated', getDelivery(deliveryOrderId));
    });

    /**
     * Requester subscribes to a delivery room.
     * Payload: { deliveryOrderId }
     */
    socket.on('requester:join', ({ deliveryOrderId }) => {
      const room = `delivery:${deliveryOrderId}`;
      socket.join(room);
      socket.deliveryOrderId = deliveryOrderId;
      socket.role = 'requester';

      // Send current state immediately
      socket.emit('delivery:updated', getDelivery(deliveryOrderId));
    });

    /**
     * Driver broadcasts location update.
     * Payload: { deliveryOrderId, lat, lng, eta }
     */
    socket.on('driver:location', ({ deliveryOrderId, lat, lng, eta }) => {
      const room = `delivery:${deliveryOrderId}`;
      const updated = updateDelivery(deliveryOrderId, {
        driverLocation: { lat, lng },
        eta: eta !== undefined ? eta : getDelivery(deliveryOrderId).eta,
      });

      io.to(room).emit('driver:location', {
        driverLocation: updated.driverLocation,
        eta: updated.eta,
      });
    });

    /**
     * Driver updates delivery status.
     * Payload: { deliveryOrderId, status }
     * Valid statuses: 'approved' | 'picking' | 'dispatched' | 'arriving' | 'delivered'
     */
    socket.on('driver:status', async ({ deliveryOrderId, status }) => {
      const room = `delivery:${deliveryOrderId}`;
      const updated = updateDelivery(deliveryOrderId, { status });

      io.to(room).emit('delivery:status', { status: updated.status });

      // Send push notification to requester
      try {
        await sendStatusNotification(deliveryOrderId, status);
      } catch (err) {
        console.error('Push notification error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      // Nothing to clean up in memory store on disconnect
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIo };
