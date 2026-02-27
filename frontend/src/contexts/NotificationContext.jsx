import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const { socket } = useSocket() || {};

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/api/notifications');
      setNotifications(data);
    } catch {
      // not authenticated yet — ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (!socket) return;
    const handler = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket]);

  const markAllRead = useCallback(async () => {
    await api.patch('/api/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, fetchNotifications, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
