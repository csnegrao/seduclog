import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DeliveryOrder, ChecklistItem, ChecklistStatus } from '../types/driver.types';
import { SignatureCanvas, SignaturePadHandle } from '../components/SignatureCanvas';
import { queueOfflineAction } from '../utils/offlineDB';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface DeliveryConfirmationProps {
  order: DeliveryOrder;
  onBack: () => void;
  onDelivered: () => void;
}

export function DeliveryConfirmation({ order, onBack, onDelivered }: DeliveryConfirmationProps) {
  const { accessToken } = useAuth();
  const isOnline = useOnlineStatus();
  const signatureRef = useRef<SignaturePadHandle>(null);

  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    order.materialRequest.requestItems.map((item) => ({
      requestItemId: item.id,
      status: 'DELIVERED' as ChecklistStatus,
      actualQty: item.quantity,
    })),
  );
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateChecklist = (idx: number, update: Partial<ChecklistItem>) => {
    setChecklist((prev) => prev.map((item, i) => (i === idx ? { ...item, ...update } : item)));
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmit = async () => {
    const sig = signatureRef.current?.getDataURL();
    if (!sig) {
      setError('Assinatura obrigatória');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = { checklist, notes, signature: sig };

      if (isOnline && accessToken) {
        let body: FormData | string;
        let headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };

        if (photo) {
          const form = new FormData();
          form.append('checklist', JSON.stringify(checklist));
          form.append('notes', notes);
          form.append('signature', sig);
          form.append('photo', photo);
          body = form;
        } else {
          body = JSON.stringify(payload);
          headers['Content-Type'] = 'application/json';
        }

        const res = await fetch(`${API_BASE}/api/driver/orders/${order.id}/deliver`, {
          method: 'POST',
          headers,
          body,
        });

        if (!res.ok) {
          const err = await res.json() as { error: string };
          throw new Error(err.error || 'Falha ao confirmar entrega');
        }
      } else {
        await queueOfflineAction(order.id, 'deliver', payload);
      }

      onDelivered();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar entrega');
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions: { value: ChecklistStatus; label: string }[] = [
    { value: 'DELIVERED', label: 'Entregue' },
    { value: 'MISSING', label: 'Faltando' },
    { value: 'DIFFERENT_QTY', label: 'Qtd. diferente' },
  ];

  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backBtn}>← Voltar</button>
      <h2 style={styles.heading}>Confirmar Entrega</h2>
      <p style={styles.subheading}>{order.materialRequest.school.name}</p>

      {/* Item Checklist */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Itens</h3>
        {order.materialRequest.requestItems.map((item, idx) => {
          const cl = checklist[idx];
          return (
            <div key={item.id} style={styles.checklistItem}>
              <div style={styles.itemInfo}>
                <span style={styles.itemName}>{item.product.name}</span>
                <span style={styles.itemUnit}>({item.quantity} {item.product.unit})</span>
              </div>
              <div style={styles.itemControls}>
                <select
                  value={cl.status}
                  onChange={(e) =>
                    updateChecklist(idx, {
                      status: e.target.value as ChecklistStatus,
                      actualQty: e.target.value === 'DELIVERED' ? item.quantity : cl.actualQty,
                    })
                  }
                  style={styles.select}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {cl.status === 'DIFFERENT_QTY' && (
                  <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={cl.actualQty ?? 0}
                    onChange={(e) => updateChecklist(idx, { actualQty: parseInt(e.target.value, 10) })}
                    style={styles.qtyInput}
                    placeholder="Qtd real"
                  />
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Notes */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Observações</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações opcionais..."
          rows={3}
          style={styles.textarea}
        />
      </section>

      {/* Signature */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Assinatura do Recebedor</h3>
          <button
            onClick={() => signatureRef.current?.clear()}
            style={styles.clearBtn}
            type="button"
          >
            Limpar
          </button>
        </div>
        <SignatureCanvas
          ref={signatureRef}
          onChange={(isEmpty) => setSignatureEmpty(isEmpty)}
        />
        {signatureEmpty && <p style={styles.hint}>Peça ao recebedor que assine acima</p>}
      </section>

      {/* Photo */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Foto da Entrega</h3>
        <label style={styles.photoLabel}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            style={{ display: 'none' }}
          />
          <span style={styles.photoBtn}>📷 {photo ? 'Trocar foto' : 'Tirar foto'}</span>
        </label>
        {photoPreview && (
          <img src={photoPreview} alt="Foto da entrega" style={styles.photoPreview} />
        )}
      </section>

      {error && <p style={styles.error}>{error}</p>}

      <button
        onClick={() => void handleSubmit()}
        disabled={signatureEmpty || submitting}
        style={{
          ...styles.submitBtn,
          opacity: signatureEmpty || submitting ? 0.5 : 1,
          cursor: signatureEmpty || submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? 'Enviando...' : '✅ Confirmar Entrega'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', maxWidth: 600, margin: '0 auto', paddingBottom: '2rem' },
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
  subheading: { margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' },
  section: { marginBottom: '1.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { margin: '0 0 0.75rem', fontSize: '1rem', color: '#1e293b', fontWeight: 600 },
  checklistItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '0.625rem 0',
    borderBottom: '1px solid #f1f5f9',
    gap: '0.75rem',
  },
  itemInfo: { flex: 1 },
  itemName: { display: 'block', fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' },
  itemUnit: { fontSize: '0.75rem', color: '#94a3b8' },
  itemControls: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  select: {
    padding: '0.375rem 0.5rem',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    fontSize: '0.8rem',
    background: '#fff',
  },
  qtyInput: {
    width: 70,
    padding: '0.375rem 0.5rem',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    fontSize: '0.8rem',
  },
  textarea: {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '0.625rem',
    fontSize: '0.875rem',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  clearBtn: {
    background: 'none',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    marginBottom: '0.75rem',
  },
  hint: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.375rem', textAlign: 'center' },
  photoLabel: { display: 'block' },
  photoBtn: {
    display: 'inline-block',
    padding: '0.625rem 1rem',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  photoPreview: {
    marginTop: '0.75rem',
    width: '100%',
    maxHeight: 200,
    objectFit: 'cover',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
  },
  error: { color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.75rem' },
  submitBtn: {
    width: '100%',
    padding: '0.875rem',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: '1rem',
    fontWeight: 600,
  },
};
