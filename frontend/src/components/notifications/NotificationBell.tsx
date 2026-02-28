import React, { useRef, useState } from 'react';
import { AppNotification } from '../../types/notifications.types';
import { NotificationPanel } from './NotificationPanel';

interface Props {
  userId: string | null;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
}

/**
 * Notification bell icon with unread badge.
 * Clicking it toggles the NotificationPanel dropdown.
 */
export function NotificationBell({
  userId,
  notifications,
  unreadCount,
  onMarkAllRead,
}: Props) {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  function toggle(): void {
    setOpen((v) => !v);
  }

  function handleMarkAllRead(): void {
    onMarkAllRead();
  }

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={toggle}
        aria-label={`Notificações${unreadCount > 0 ? ` — ${unreadCount} não lidas` : ''}`}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {/* Bell icon (SVG) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <NotificationPanel
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
