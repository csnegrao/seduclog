import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DeliveryOrder } from '../types/driver.types';
import { queueOfflineAction } from '../utils/offlineDB';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface ActiveDeliveryProps {
  order: DeliveryOrder;
  onBack: () => void;
  onConfirmDelivery: () => void;
}

export function ActiveDelivery({ order, onBack, onConfirmDelivery }: ActiveDeliveryProps) {
  const { accessToken } = useAuth();
  const isOnline = useOnlineStatus();
  const school = order.materialRequest.school;

  const [occurrenceDesc, setOccurrenceDesc] = useState('');
  const [showOccurrenceForm, setShowOccurrenceForm] = useState(false);
  const [occurrenceMsg, setOccurrenceMsg] = useState('');
  const [pickupDone, setPickupDone] = useState(order.status !== 'ASSIGNED');

  const handlePickup = async () => {
    try {
      if (isOnline && accessToken) {
        const res = await fetch(`${API_BASE}/api/driver/orders/${order.id}/pickup`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error('Falha ao confirmar coleta');
      } else {
        await queueOfflineAction(order.id, 'pickup', {});
      }
      setPickupDone(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao confirmar coleta');
    }
  };

  const handleOccurrence = async () => {
    if (!occurrenceDesc.trim()) return;
    try {
      if (isOnline && accessToken) {
        const res = await fetch(`${API_BASE}/api/driver/orders/${order.id}/occurrence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ description: occurrenceDesc }),
        });
        if (!res.ok) throw new Error('Falha ao registrar ocorrência');
      } else {
        await queueOfflineAction(order.id, 'occurrence', { description: occurrenceDesc });
      }
      setOccurrenceMsg('Ocorrência registrada!');
      setOccurrenceDesc('');
      setShowOccurrenceForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao registrar ocorrência');
    }
  };

  const mapsEmbedUrl =
    school.lat && school.lng && MAPS_KEY
      ? `https://www.google.com/maps/embed/v1/directions?key=${MAPS_KEY}&destination=${school.lat},${school.lng}&mode=driving`
      : null;

  const mapsNavUrl =
    school.lat && school.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${school.lat},${school.lng}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.address + ', ' + school.city)}`;

  const latestUpdate = order.routeUpdates[0];

  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backBtn}>← Voltar</button>

      <h2 style={styles.heading}>{school.name}</h2>
      <p style={styles.address}>{school.address}, {school.city}</p>

      {latestUpdate?.estimatedArrival && (
        <div style={styles.etaBanner}>
          <span style={styles.etaLabel}>ETA:</span>
          <span style={styles.etaTime}>
            {new Date(latestUpdate.estimatedArrival).toLocaleTimeString('pt-BR')}
          </span>
        </div>
      )}

      {/* Map */}
      <div style={styles.mapContainer}>
        {mapsEmbedUrl ? (
          <iframe
            title="Mapa de rota"
            src={mapsEmbedUrl}
            style={styles.mapIframe}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div style={styles.mapPlaceholder}>
            <p>Mapa não disponível</p>
            <a href={mapsNavUrl} target="_blank" rel="noreferrer" style={styles.navLink}>
              Abrir no Google Maps →
            </a>
          </div>
        )}
      </div>

      {mapsEmbedUrl && (
        <a href={mapsNavUrl} target="_blank" rel="noreferrer" style={styles.navBtn}>
          🧭 Navegar no Google Maps
        </a>
      )}

      {/* Pickup confirmation */}
      {!pickupDone && order.status === 'ASSIGNED' && (
        <button onClick={() => void handlePickup()} style={styles.primaryBtn}>
          ✅ Confirmar Coleta no Depósito
        </button>
      )}

      {pickupDone && (
        <>
          <button
            onClick={() => setShowOccurrenceForm(!showOccurrenceForm)}
            style={styles.occurrenceBtn}
          >
            ⚠ Registrar Ocorrência
          </button>

          {showOccurrenceForm && (
            <div style={styles.occurrenceForm}>
              <textarea
                value={occurrenceDesc}
                onChange={(e) => setOccurrenceDesc(e.target.value)}
                placeholder="Descreva a ocorrência..."
                rows={3}
                style={styles.textarea}
              />
              <div style={styles.occurrenceBtns}>
                <button onClick={() => void handleOccurrence()} style={styles.submitBtn}>
                  Enviar
                </button>
                <button onClick={() => setShowOccurrenceForm(false)} style={styles.cancelBtn}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {occurrenceMsg && <p style={styles.successMsg}>{occurrenceMsg}</p>}

          <button onClick={onConfirmDelivery} style={styles.deliverBtn}>
            📦 Confirmar Entrega
          </button>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', maxWidth: 600, margin: '0 auto' },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#1e3a5f',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '0.25rem 0',
    marginBottom: '0.75rem',
  },
  heading: { margin: '0 0 0.25rem', fontSize: '1.25rem', color: '#1e3a5f' },
  address: { margin: '0 0 1rem', color: '#64748b', fontSize: '0.875rem' },
  etaBanner: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    background: '#ecfdf5',
    border: '1px solid #6ee7b7',
    borderRadius: 6,
    padding: '0.5rem 1rem',
    marginBottom: '1rem',
  },
  etaLabel: { fontWeight: 600, color: '#065f46', fontSize: '0.875rem' },
  etaTime: { color: '#059669', fontWeight: 700, fontSize: '1rem' },
  mapContainer: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    marginBottom: '1rem',
    background: '#f1f5f9',
  },
  mapIframe: { width: '100%', height: '100%', border: 'none' },
  mapPlaceholder: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
  navLink: { color: '#3b82f6', textDecoration: 'none', fontWeight: 500 },
  navBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '0.625rem',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 6,
    color: '#1d4ed8',
    textDecoration: 'none',
    fontWeight: 500,
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  primaryBtn: {
    width: '100%',
    padding: '0.875rem',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '0.75rem',
  },
  occurrenceBtn: {
    width: '100%',
    padding: '0.75rem',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: 6,
    color: '#c2410c',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: '0.75rem',
  },
  occurrenceForm: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '0.75rem',
    marginBottom: '0.75rem',
  },
  textarea: {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    padding: '0.5rem',
    fontSize: '0.875rem',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  occurrenceBtns: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' },
  submitBtn: {
    flex: 1,
    padding: '0.5rem',
    background: '#1e3a5f',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
  },
  cancelBtn: {
    flex: 1,
    padding: '0.5rem',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    cursor: 'pointer',
  },
  successMsg: { color: '#059669', fontSize: '0.875rem', marginBottom: '0.75rem' },
  deliverBtn: {
    width: '100%',
    padding: '0.875rem',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
