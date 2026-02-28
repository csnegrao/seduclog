import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import {
  findNotificationsForUser,
  markAllReadForUser,
  countUnreadForUser,
} from '../models/notification.model';

// ─── GET /api/notifications ───────────────────────────────────────────────────

/**
 * Returns all notifications for the authenticated user, unread first.
 * Includes the total unread count for badge display.
 */
export function listNotificationsHandler(req: AuthenticatedRequest, res: Response): void {
  const userId = req.user!.userId;
  const notifications = findNotificationsForUser(userId);
  const unreadCount = countUnreadForUser(userId);
  res.status(200).json({ notifications, unreadCount });
}

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

/**
 * Marks all unread notifications for the authenticated user as read.
 * Returns the number of notifications that were updated.
 */
export function markAllReadHandler(req: AuthenticatedRequest, res: Response): void {
  const userId = req.user!.userId;
  const updated = markAllReadForUser(userId);
  res.status(200).json({ updated });
}
