import { randomUUID } from 'crypto';
import { NotificationEvent, Notification } from '../types';
import { createNotification } from '../models/notification.model';
import { emitNotification } from './socket';

interface NotifPayload {
  userId: string;
  event: NotificationEvent;
  title: string;
  body: string;
  referenceId?: string;
}

/**
 * Creates a Notification record in the store and emits a real-time
 * "notification:new" Socket.io event to the target user's room.
 *
 * This is an **internal** helper — it is NOT exposed as a public HTTP route.
 */
export function pushNotification(payload: NotifPayload): Notification {
  const notification: Notification = {
    id: randomUUID(),
    userId: payload.userId,
    event: payload.event,
    title: payload.title,
    body: payload.body,
    referenceId: payload.referenceId,
    read: false,
    createdAt: new Date(),
  };
  createNotification(notification);
  emitNotification(notification);
  return notification;
}
