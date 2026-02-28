import React from 'react';

interface Props {
  online: boolean;
  pendingCount?: number;
}

/**
 * Connection status indicator shown in the app header.
 * Displays a green "Online" pill when connected, or a red "Offline" pill
 * with the number of pending syncs when disconnected.
 */
export function ConnectionStatus({ online, pendingCount = 0 }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        online
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`}
        aria-hidden="true"
      />
      {online ? (
        'Online'
      ) : (
        <>
          Offline
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-red-200 text-red-800 px-1.5 py-0.5 text-xs">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
        </>
      )}
    </div>
  );
}
