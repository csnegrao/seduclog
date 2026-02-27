const prisma = require('../prismaClient');

/**
 * GET /api/notifications
 * Returns the authenticated user's notifications, unread first.
 */
async function listNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all of the authenticated user's notifications as read.
 */
async function markAllRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
}

module.exports = { listNotifications, markAllRead };
