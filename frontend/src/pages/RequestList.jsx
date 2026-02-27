import { useEffect, useState } from 'react';
import api from '../api/client';
import { useSocket } from '../contexts/SocketContext';

const statusLabels = {
  PENDING: '⏳ Pendente',
  APPROVED: '✅ Aprovada',
  REJECTED: '❌ Rejeitada',
  IN_TRANSIT: '🚚 Em trânsito',
  DELIVERED: '📦 Entregue',
};

export default function RequestList({ onSelect }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket() || {};

  useEffect(() => {
    api
      .get('/api/requests')
      .then(({ data }) => setRequests(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Update unread message count in real time
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === msg.requestId
            ? { ...r, _count: { messages: (r._count?.messages || 0) + 1 } }
            : r,
        ),
      );
    };
    socket.on('message:new', handler);
    return () => socket.off('message:new', handler);
  }, [socket]);

  if (loading) return <p>Carregando solicitações…</p>;

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Solicitações</h2>
      {requests.length === 0 && (
        <p style={{ color: '#718096', textAlign: 'center' }}>Nenhuma solicitação encontrada.</p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {requests.map((r) => {
          const unreadMessages = r._count?.messages || 0;
          return (
            <li
              key={r.id}
              onClick={() => onSelect(r.id)}
              style={{
                padding: '14px 16px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{r.title}</strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#718096' }}>
                  {statusLabels[r.status] || r.status}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {unreadMessages > 0 && (
                  <span
                    style={{
                      background: '#3182ce',
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                    }}
                    title="Mensagens não lidas"
                  >
                    💬 {unreadMessages}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
