import React, { useEffect, useState } from 'react';
import { MaterialRequest, RequestStatus } from '../../types/request.types';
import { useRequests } from '../../hooks/useRequests';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../contexts/AuthContext';
import { MessageThread } from '../messages/MessageThread';

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  in_progress: 'Em Andamento',
  in_transit: 'Em Trânsito',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  in_transit: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

interface Props {
  requestId: string;
  onBack?: () => void;
}

/**
 * Request detail screen.
 *
 * Shows:
 *  - Request metadata and current status badge
 *  - Item table with requested / approved quantities
 *  - Status history timeline
 *  - Driver location map placeholder (replace with real Google Maps integration)
 *  - In-thread message panel (backed by real API + Socket.io)
 *
 * Receives real-time updates via Socket.io.
 */
export function RequestDetail({ requestId, onBack }: Props) {
  const { fetchRequest, approveRequest, cancelRequest } = useRequests();
  const { user, hasRole } = useAuth();

  const [req, setReq] = useState<MaterialRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRequest(requestId);
      setReq(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [fetchRequest, requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Real-time: refresh when this specific request is updated.
  useSocket((updated) => {
    if (updated.id === requestId) setReq(updated);
  });

  const handleApprove = async () => {
    if (!req) return;
    setActionError(null);
    try {
      const updated = await approveRequest(req.id, { notes: 'Aprovado pelo operador' });
      setReq(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleCancel = async () => {
    if (!req) return;
    setActionError(null);
    try {
      const updated = await cancelRequest(req.id, 'Cancelado pelo usuário');
      setReq(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    );
  }

  if (error || !req) {
    return (
      <div className="p-4">
        <button onClick={onBack} className="text-blue-600 text-sm mb-4">
          ← Voltar
        </button>
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error ?? 'Requisição não encontrada'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-8 max-w-2xl mx-auto">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="self-start text-blue-600 text-sm hover:underline"
        >
          ← Voltar
        </button>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-gray-500">{req.protocol}</p>
          <h2 className="text-xl font-semibold mt-0.5">{req.school}</h2>
          <p className="text-sm text-gray-500">Solicitante: {req.requesterName}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold border ${STATUS_COLORS[req.status]}`}
        >
          {STATUS_LABELS[req.status]}
        </span>
      </div>

      {/* Justification */}
      <div className="rounded-xl border border-gray-200 p-4 bg-white">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Justificativa
        </p>
        <p className="text-sm text-gray-700">{req.justification}</p>
        <p className="text-xs text-gray-400 mt-2">
          Data desejada:{' '}
          {new Date(req.desiredDate).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Items table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <p className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
          Itens
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Produto</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Solicitado</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Aprovado</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Un.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {req.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">{item.productName}</td>
                  <td className="px-4 py-2 text-right">{item.requestedQuantity}</td>
                  <td className="px-4 py-2 text-right">
                    {item.approvedQuantity ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver location map */}
      {req.status === 'in_transit' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <p className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
            Localização do motorista
          </p>
          <DriverLocationMap />
        </div>
      )}

      {/* Action buttons */}
      {actionError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {actionError}
        </div>
      )}
      {req.status === 'pending' && (
        <div className="flex gap-3">
          {hasRole('warehouse_operator', 'admin') && (
            <button
              onClick={() => void handleApprove()}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Aprovar
            </button>
          )}
          {(hasRole('requester') && req.requesterId === user?.id) ||
          hasRole('warehouse_operator', 'admin') ? (
            <button
              onClick={() => void handleCancel()}
              className="flex-1 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      )}

      {/* History timeline */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <p className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
          Histórico
        </p>
        <ol className="p-4 flex flex-col gap-3">
          {req.history.map((entry, idx) => (
            <li key={entry.id} className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full mt-0.5 ${STATUS_COLORS[entry.status].split(' ')[0]}`}
                />
                {idx < req.history.length - 1 && (
                  <div className="w-px flex-1 bg-gray-200 mt-1" />
                )}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium border ${STATUS_COLORS[entry.status]}`}
                  >
                    {STATUS_LABELS[entry.status]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(entry.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  por {entry.changedByName}
                </p>
                {entry.notes && (
                  <p className="text-xs text-gray-600 mt-1 italic">{entry.notes}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Message thread — backed by real API + Socket.io */}
      {user && (
        <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ height: 420 }}>
          <MessageThread
            requestId={requestId}
            currentUserId={user.id}
            currentUserRole={user.role}
          />
        </div>
      )}
    </div>
  );
}

// ─── Driver Location Map ──────────────────────────────────────────────────────

/**
 * Placeholder for the Google Maps driver location widget.
 *
 * To enable:
 *  1. Install: npm install @react-google-maps/api
 *  2. Add REACT_APP_GOOGLE_MAPS_API_KEY to your .env
 *  3. Replace this component with a real <GoogleMap> implementation.
 */
function DriverLocationMap() {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    // Embed map via iframe (no additional JS library required).
    return (
      <iframe
        title="Driver location"
        width="100%"
        height="200"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=current+location`}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-40 bg-gray-50 text-center p-4">
      <p className="text-sm text-gray-500">Mapa indisponível</p>
      <p className="text-xs text-gray-400 mt-1">
        Configure <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> para exibir a localização do
        motorista em tempo real.
      </p>
    </div>
  );
}
