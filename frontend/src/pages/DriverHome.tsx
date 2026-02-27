import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DeliveryOrder } from '../types/driver.types';
import { cacheOrders, getCachedOrders } from '../utils/offlineDB';
import { syncPendingActions } from '../utils/syncQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface DriverHomeProps {
  onSelectOrder: (order: DeliveryOrder) => void;
}

export function DriverHome({ onSelectOrder }: DriverHomeProps) {
  const { accessToken } = useAuth();
  const isOnline = useOnlineStatus();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isOnline && accessToken) {
        const res = await fetch(`${API_BASE}/api/driver/orders`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error('Falha ao carregar pedidos');
        const data = await res.json() as { orders: DeliveryOrder[] };
        await cacheOrders(data.orders);
        setOrders(data.orders);
        // Sync any pending offline actions
        await syncPendingActions(accessToken);
      } else {
        const cached = await getCachedOrders();
        setOrders(cached as DeliveryOrder[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
      // Fallback to cache
      const cached = await getCachedOrders();
      setOrders(cached as DeliveryOrder[]);
    } finally {
      setLoading(false);
    }
  }, [isOnline, accessToken]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // Re-sync when coming back online
  useEffect(() => {
    if (isOnline && accessToken) {
      syncPendingActions(accessToken).catch(console.error);
    }
  }, [isOnline, accessToken]);

  const statusLabel: Record<string, string> = {
    ASSIGNED: 'Atribuído',
    PICKED_UP: 'Coletado',
    IN_TRANSIT: 'Em trânsito',
    DELIVERED: 'Entregue',
    PARTIAL: 'Parcial',
  };

  const statusColor: Record<string, string> = {
    ASSIGNED: '#f59e0b',
    PICKED_UP: '#3b82f6',
    IN_TRANSIT: '#8b5cf6',
    DELIVERED: '#22c55e',
    PARTIAL: '#f97316',
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p>Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <h2 style={styles.heading}>Minhas Entregas</h2>
        <button onClick={() => void loadOrders()} style={styles.refreshBtn}>
          ↺ Atualizar
        </button>
      </div>

      {!isOnline && (
        <div style={styles.offlineBanner}>
          ⚠ Modo offline — exibindo dados em cache
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}

      {orders.length === 0 ? (
        <div style={styles.center}>
          <p style={{ color: '#64748b' }}>Nenhuma entrega atribuída.</p>
        </div>
      ) : (
        <ul style={styles.list}>
          {orders.map((order) => (
            <li
              key={order.id}
              style={styles.card}
              onClick={() => onSelectOrder(order)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectOrder(order)}
            >
              <div style={styles.cardHeader}>
                <span style={styles.schoolName}>{order.materialRequest.school.name}</span>
                <span
                  style={{
                    ...styles.statusBadge,
                    background: statusColor[order.status] || '#94a3b8',
                  }}
                >
                  {statusLabel[order.status] || order.status}
                </span>
              </div>
              <p style={styles.cardAddress}>
                {order.materialRequest.school.address}, {order.materialRequest.school.city}
              </p>
              <p style={styles.cardItems}>
                {order.materialRequest.requestItems.length} item(ns) •{' '}
                <span style={styles.plate}>{order.vehicle.plate}</span>
              </p>
              {order.routeUpdates.length > 0 && order.routeUpdates[0].estimatedArrival && (
                <p style={styles.eta}>
                  ETA: {new Date(order.routeUpdates[0].estimatedArrival).toLocaleTimeString('pt-BR')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', maxWidth: 600, margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  heading: { margin: 0, fontSize: '1.25rem', color: '#1e3a5f' },
  refreshBtn: {
    background: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '0.375rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  offlineBanner: {
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: 6,
    padding: '0.5rem 1rem',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    color: '#92400e',
  },
  error: { color: '#ef4444', fontSize: '0.875rem' },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '1rem',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'box-shadow 0.2s',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' },
  schoolName: { fontWeight: 600, color: '#1e3a5f' },
  statusBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#fff',
  },
  cardAddress: { margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#64748b' },
  cardItems: { margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#475569' },
  plate: { fontWeight: 600 },
  eta: { margin: 0, fontSize: '0.8rem', color: '#059669', fontWeight: 500 },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' },
};
