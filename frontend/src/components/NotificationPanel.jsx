import { useEffect, useRef } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

const TYPE_LABELS = {
  REQUEST_APPROVED: '✅',
  REQUEST_REJECTED: '❌',
  ORDER_DISPATCHED: '🚚',
  DRIVER_ARRIVING: '📍',
  DELIVERY_CONFIRMED: '📦',
  STOCK_BELOW_MINIMUM: '⚠️',
  GENERAL: '💬',
};

export default function NotificationPanel({ onClose }) {
  const { notifications, markAllRead } = useNotifications();
  const panelRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        right: 0,
        top: '110%',
        width: '340px',
        maxHeight: '420px',
        overflowY: 'auto',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          background: '#fff',
        }}
      >
        <strong style={{ fontSize: '0.95rem' }}>Notificações</strong>
        <button
          onClick={markAllRead}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#3182ce',
            fontSize: '0.8rem',
          }}
        >
          Marcar todas como lidas
        </button>
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <p style={{ padding: '16px', textAlign: 'center', color: '#718096', fontSize: '0.9rem' }}>
          Nenhuma notificação
        </p>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f7fafc',
              background: n.isRead ? '#fff' : '#ebf8ff',
              display: 'flex',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{TYPE_LABELS[n.type] || '🔔'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: n.isRead ? 'normal' : 'bold', fontSize: '0.875rem' }}>
                {n.title}
              </p>
              <p style={{ margin: '2px 0 0', color: '#4a5568', fontSize: '0.8rem' }}>{n.message}</p>
              <p style={{ margin: '4px 0 0', color: '#a0aec0', fontSize: '0.72rem' }}>
                {new Date(n.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
            {!n.isRead && (
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#3182ce',
                  flexShrink: 0,
                  marginTop: '4px',
                }}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
}
