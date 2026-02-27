const prisma = require('../prismaClient');

/**
 * Internal service to create and persist a notification.
 * Not exposed as a public HTTP route.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.type  - NotificationType enum value
 * @param {string} params.title
 * @param {string} params.message
 * @param {object} [io]         - Socket.io server instance (optional)
 * @returns {Promise<object>}   - Created notification
 */
async function createNotification({ userId, type, title, message }, io) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message },
  });

  // Emit real-time event to the target user's personal room
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }

  return notification;
}

module.exports = { createNotification };
