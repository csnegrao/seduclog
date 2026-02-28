import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { useNotifications } from '../../hooks/useNotifications';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Gestor',
  warehouse_operator: 'Almoxarifado',
  driver: 'Motorista',
  requester: 'Solicitante',
  viewer: 'Visualizador',
};

/**
 * Application header shown on all authenticated screens.
 * Contains the Seduclog logo, the current user's role badge,
 * a notification bell with real-time unread count, and a logout button.
 */
export function AppHeader() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications(user?.id ?? null);

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
      {/* Logo / brand */}
      <div className="flex items-center gap-2">
        <span className="text-blue-600 font-bold text-lg tracking-tight">Seduclog</span>
        {user && (
          <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        {user && (
          <NotificationBell
            userId={user.id}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={() => void markAllRead()}
          />
        )}

        {/* User name */}
        {user && (
          <span className="hidden sm:block text-sm text-gray-700 font-medium">
            {user.name}
          </span>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
