import React, { useEffect, useState } from 'react';
import { MaterialRequest, RequestStatus } from '../../types/request.types';
import { useRequests } from '../../hooks/useRequests';
import { useSocket } from '../../hooks/useSocket';
import { getSocket } from '../../utils/socket';
import { Message } from '../../types/notifications.types';

const STATUS_TABS: Array<{ label: string; value: RequestStatus | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Aprovado', value: 'approved' },
  { label: 'Em Andamento', value: 'in_progress' },
  { label: 'Em Trânsito', value: 'in_transit' },
  { label: 'Entregue', value: 'delivered' },
];

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  in_progress: 'Em Andamento',
  in_transit: 'Em Trânsito',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  in_transit: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

interface Props {
  onSelectRequest?: (id: string) => void;
  currentUserId?: string;
}

/**
 * Request list screen with status filter tabs.
 * Listens for real-time updates via Socket.io.
 * Shows an unread message indicator badge on requests with new messages.
 */
export function RequestList({ onSelectRequest, currentUserId }: Props) {
  const { requests, loading, error, fetchRequests, patchRequest } = useRequests();
  const [activeTab, setActiveTab] = useState<RequestStatus | 'all'>('all');
  // Map of requestId → unread message count
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});

  // Load on mount and when the active tab changes.
  useEffect(() => {
    void fetchRequests(activeTab === 'all' ? {} : { status: activeTab });
  }, [activeTab, fetchRequests]);

  // Keep the list in sync with real-time status changes.
  useSocket((updated) => {
    const matchesTab = activeTab === 'all' || updated.status === activeTab;
    if (matchesTab) {
      patchRequest(updated);
    } else {
      void fetchRequests(activeTab === 'all' ? {} : { status: activeTab });
    }
  });

  // Track incoming messages as unread indicators.
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (msg: Message) => {
      // Ignore messages sent by the current user.
      if (msg.senderId === currentUserId) return;
      setUnreadMessages((prev) => ({
        ...prev,
        [msg.requestId]: (prev[msg.requestId] ?? 0) + 1,
      }));
    };

    socket.on('message:new', handleNewMessage);
    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [currentUserId]);

  // Clear unread indicator when the user opens a request.
  const handleSelectRequest = (id: string) => {
    setUnreadMessages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    onSelectRequest?.(id);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white sticky top-0 z-10">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading && (
          <p className="text-center text-gray-500 py-8 text-sm">Carregando...</p>
        )}

        {!loading && error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <p className="text-center text-gray-500 py-12 text-sm">
            Nenhuma requisição encontrada.
          </p>
        )}

        {!loading && !error && requests.length > 0 && (
          <ul className="flex flex-col gap-3">
            {requests.map((req) => {
              const msgCount = unreadMessages[req.id] ?? 0;
              return (
                <li key={req.id}>
                  <button
                    className="w-full text-left rounded-xl bg-white border border-gray-200 p-4 shadow-sm hover:border-blue-300 transition-colors"
                    onClick={() => handleSelectRequest(req.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-mono text-xs text-gray-500">{req.protocol}</span>
                      <div className="flex items-center gap-2">
                        {/* Unread message indicator */}
                        {msgCount > 0 && (
                          <span className="inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold h-4 min-w-[1rem] px-1">
                            {msgCount > 9 ? '9+' : msgCount}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}
                        >
                          {STATUS_LABELS[req.status]}
                        </span>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900 text-sm mb-1">{req.school}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{req.justification}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                      <span>{req.items.length} item(s)</span>
                      <span>{formatDate(req.createdAt)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
