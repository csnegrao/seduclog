import { UserRole } from './auth.types';

export type NotificationEvent =
  | 'request_approved'
  | 'request_cancelled'
  | 'order_dispatched'
  | 'driver_arriving'
  | 'delivery_confirmed'
  | 'stock_below_minimum';

export interface AppNotification {
  id: string;
  userId: string;
  event: NotificationEvent;
  title: string;
  body: string;
  referenceId?: string;
  read: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  createdAt: string;
}
