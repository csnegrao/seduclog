import React, { useEffect, useState } from 'react';
import { MaterialRequest, RequestStatus } from '../../types/request.types';
import { useWarehouse } from '../../hooks/useWarehouse';

const PRIORITY_THRESHOLDS_DAYS = { high: 3, medium: 7 };

type Priority = 'high' | 'medium' | 'normal';

function getPriority(desiredDate: string): Priority {
  const days = Math.ceil(
    (new Date(desiredDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days <= PRIORITY_THRESHOLDS_DAYS.high) return 'high';
  if (days <= PRIORITY_THRESHOLDS_DAYS.medium) return 'medium';
  return 'normal';
}

const PRIORITY_BADGES: Record<Priority, { label: string; className: string }> = {
  high: { label: 'URGENTE', className: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: 'MÉDIO', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  normal: { label: 'NORMAL', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

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
  onSelectRequest?: (req: MaterialRequest) => void;
}

/**
 * Warehouse operator's request queue dashboard.
 * Shows pending and approved requests sorted by desired date, with priority badges.
 */
export function QueueDashboard({ onSelectRequest }: Props) {
  const { queue, loading, error, fetchQueue } = useWarehouse();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue, refreshKey]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-gray-900">Fila de Requisições</h2>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="text-sm text-blue-600 hover:underline"
        >
          Atualizar
        </button>
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

        {!loading && !error && queue.length === 0 && (
          <p className="text-center text-gray-500 py-12 text-sm">
            Nenhuma requisição na fila.
          </p>
        )}

        {!loading && !error && queue.length > 0 && (
          <ul className="flex flex-col gap-3">
            {queue.map((req) => {
              const priority = getPriority(req.desiredDate);
              const badge = PRIORITY_BADGES[priority];
              return (
                <li key={req.id}>
                  <button
                    className="w-full text-left rounded-xl bg-white border border-gray-200 p-4 shadow-sm hover:border-blue-300 transition-colors"
                    onClick={() => onSelectRequest?.(req)}
                  >
                    {/* Top row: priority badge + status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-bold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}
                      >
                        {STATUS_LABELS[req.status]}
                      </span>
                    </div>

                    {/* Protocol + school */}
                    <p className="font-mono text-xs text-gray-400 mb-0.5">{req.protocol}</p>
                    <p className="font-semibold text-gray-900">{req.school}</p>
                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                      {req.justification}
                    </p>

                    {/* Footer: items count + desired date */}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                      <span>{req.items.length} item(s)</span>
                      <span>
                        Data desejada:{' '}
                        <strong className="text-gray-600">{formatDate(req.desiredDate)}</strong>
                      </span>
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
