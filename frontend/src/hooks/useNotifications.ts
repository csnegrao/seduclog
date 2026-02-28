import { useCallback, useEffect, useRef, useState } from 'react';
import { authHeaders } from './useRequests';
import { AppNotification } from '../types/notifications.types';
import { getSocket } from '../utils/socket';

const API_BASE = process.env.REACT_APP_API_BASE ?? 'http://localhost:3001';

async function handleResponse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error((body as { message?: string }).message ?? 'Request failed');
  return body;
}

export interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

/**
 * Fetches the authenticated user's notifications and subscribes to
 * real-time "notification:new" Socket.io events.
 *
 * @param userId - The current user's ID, used to join the notification room.
 */
export function useNotifications(userId: string | null): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Join the user's notification room when connected.
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();

    const handleConnect = () => {
      socket.emit('join:notifications', userId);
    };

    if (socket.connected) {
      socket.emit('join:notifications', userId);
    }
    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [userId]);

  // Listen for incoming notifications in real-time.
  useEffect(() => {
    const socket = getSocket();

    const handleNew = (notif: AppNotification) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
    };

    socket.on('notification:new', handleNew);
    return () => {
      socket.off('notification:new', handleNew);
    };
  }, []);

  const fetchNotifications = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: authHeaders(),
      });
      const data = await handleResponse<{
        notifications: AppNotification[];
        unreadCount: number;
      }>(res);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async (): Promise<void> => {
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Initial fetch
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (userId && !fetchedRef.current) {
      fetchedRef.current = true;
      void fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  return { notifications, unreadCount, loading, error, fetchNotifications, markAllRead };
}
