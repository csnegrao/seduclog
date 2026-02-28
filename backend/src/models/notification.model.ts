import { Notification, NotificationEvent } from '../types';

// In-memory notification store — replace with a real database in production.
const notifications: Notification[] = [];

export function createNotification(notif: Notification): Notification {
  notifications.push(notif);
  return notif;
}

/**
 * Returns all notifications for a user, unread first, then sorted by
 * createdAt descending within each group.
 */
export function findNotificationsForUser(userId: string): Notification[] {
  return notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => {
      // Unread first
      if (a.read !== b.read) return a.read ? 1 : -1;
      // Then newest first
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}

/** Marks all notifications for a user as read. Returns the count updated. */
export function markAllReadForUser(userId: string): number {
  let count = 0;
  for (const n of notifications) {
    if (n.userId === userId && !n.read) {
      n.read = true;
      count += 1;
    }
  }
  return count;
}

/** Returns the number of unread notifications for a user. */
export function countUnreadForUser(userId: string): number {
  return notifications.filter((n) => n.userId === userId && !n.read).length;
}

export { NotificationEvent };
