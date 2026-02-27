import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useSocket } from '../contexts/SocketContext';
import MessageThread from '../components/MessageThread';

export default function RequestDetail({ requestId, onBack }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/requests/${requestId}`)
      .then(({ data }) => setRequest(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) return <p>Carregando…</p>;
  if (!request) return <p>Solicitação não encontrada.</p>;

  const statusLabels = {
    PENDING: '⏳ Pendente',
    APPROVED: '✅ Aprovada',
    REJECTED: '❌ Rejeitada',
    IN_TRANSIT: '🚚 Em trânsito',
    DELIVERED: '📦 Entregue',
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#3182ce',
          cursor: 'pointer',
          marginBottom: '16px',
          fontSize: '0.9rem',
        }}
      >
        ← Voltar
      </button>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>{request.title}</h2>
        <p style={{ color: '#4a5568', margin: '0 0 8px', fontSize: '0.9rem' }}>
          {request.description}
        </p>
        <p style={{ margin: '0', fontSize: '0.85rem', color: '#718096' }}>
          Status: <strong>{statusLabels[request.status] || request.status}</strong>
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#a0aec0' }}>
          Solicitante: {request.requester?.name}
        </p>
      </div>

      <MessageThread requestId={requestId} />
    </div>
  );
}
