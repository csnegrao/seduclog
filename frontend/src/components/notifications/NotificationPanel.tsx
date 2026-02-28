import React, { useEffect, useRef } from 'react';
import { AppNotification, NotificationEvent } from '../../types/notifications.types';

interface Props {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClose: () => void;
}

const EVENT_ICONS: Record<NotificationEvent, string> = {
  request_approved: '✅',
  request_cancelled: '❌',
  order_dispatched: '🚐',
  driver_arriving: '📍',
  delivery_confirmed: '📦',
  stock_below_minimum: '⚠️',
};

/**
 * Dropdown panel listing all notifications for the current user.
 * Closes when the user clicks outside or presses Escape.
 */
export function NotificationPanel({ notifications, onMarkAllRead, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white shadow-xl border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">
          Notificações
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
              {unreadCount} novas
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-blue-600 hover:underline"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* List */}
      <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
        {notifications.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-gray-400">
            Nenhuma notificação
          </li>
        ) : (
          notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                n.read ? 'bg-white' : 'bg-blue-50'
              }`}
            >
              {/* Event icon */}
              <span className="mt-0.5 text-lg shrink-0">
                {EVENT_ICONS[n.event] ?? '🔔'}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 leading-snug">
                  {n.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              {/* Unread dot */}
              {!n.read && (
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
