import React, { useCallback, useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import { DeliveryOrder, PicklistItem } from '../../types/warehouse.types';
import { DeliveryItemResult, DeliveryItemStatus } from '../../types/driver.types';
import { useDriver } from '../../hooks/useDriver';
import { ConnectionStatus } from './ConnectionStatus';

interface ItemState {
  item: PicklistItem;
  status: DeliveryItemStatus;
  deliveredQuantity: number;
}

interface Props {
  order: DeliveryOrder;
  onComplete?: (order: DeliveryOrder) => void;
  onBack?: () => void;
}

/**
 * Delivery confirmation screen.
 *
 * Features:
 *  - Item checklist: delivered / missing / partial with actual qty input
 *  - Notes field
 *  - Full-width signature pad (using signature_pad library)
 *  - Camera capture for delivery photo
 *  - Submit button disabled until signature is captured
 *  - Connection status indicator
 *  - Queues the action offline if network is unavailable
 */
export function DeliveryConfirmation({ order, onComplete, onBack }: Props) {
  const { online, pendingCount, deliver } = useDriver();

  // Item checklist state.
  const [items, setItems] = useState<ItemState[]>(
    order.picklist.map((item) => ({
      item,
      status: 'delivered' as DeliveryItemStatus,
      deliveredQuantity: item.approvedQuantity,
    })),
  );

  const [notes, setNotes] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | undefined>();
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Signature pad.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const pad = new SignaturePad(canvasRef.current, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    });
    sigPadRef.current = pad;
    pad.addEventListener('endStroke', () => setHasSignature(!pad.isEmpty()));
    return () => pad.off();
  }, []);

  // Resize canvas to fill its container.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      sigPadRef.current?.clear();
      setHasSignature(false);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const clearSignature = () => {
    sigPadRef.current?.clear();
    setHasSignature(false);
  };

  // Item status helpers.
  const updateItemStatus = (itemId: string, status: DeliveryItemStatus) => {
    setItems((prev) =>
      prev.map((s) =>
        s.item.itemId === itemId
          ? {
              ...s,
              status,
              deliveredQuantity:
                status === 'missing' ? 0 : status === 'delivered' ? s.item.approvedQuantity : s.deliveredQuantity,
            }
          : s,
      ),
    );
  };

  const updateDeliveredQty = (itemId: string, qty: number) => {
    setItems((prev) =>
      prev.map((s) => (s.item.itemId === itemId ? { ...s, deliveredQuantity: qty } : s)),
    );
  };

  // Camera capture.
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URL prefix to get pure base64.
      setPhotoBase64(result.replace(/^data:image\/[^;]+;base64,/, ''));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = useCallback(async () => {
    if (!hasSignature) {
      setError('Assinatura é obrigatória.');
      return;
    }

    const signature = sigPadRef.current?.toDataURL('image/png') ?? '';
    const signatureBase64 = signature.replace(/^data:image\/png;base64,/, '');

    const results: DeliveryItemResult[] = items.map((s) => ({
      itemId: s.item.itemId,
      status: s.status,
      deliveredQuantity: s.deliveredQuantity,
    }));

    setSubmitting(true);
    setError(null);

    try {
      const updated = await deliver(order.id, {
        items: results,
        notes: notes || undefined,
        signatureBase64,
        photoBase64,
      });

      if (updated) {
        setDone(true);
        onComplete?.(updated);
      } else if (!online) {
        setDone(true);
        onComplete?.(order);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm delivery');
    } finally {
      setSubmitting(false);
    }
  }, [hasSignature, online, items, notes, photoBase64, deliver, order, onComplete]);

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-6xl">✅</div>
        <h3 className="text-xl font-semibold text-green-700">
          {online ? 'Entrega confirmada!' : 'Entrega salva para sincronizar'}
        </h3>
        <p className="text-sm text-gray-500">
          {online
            ? 'A entrega foi registrada com sucesso.'
            : 'Será sincronizado quando a conexão for restaurada.'}
        </p>
        {onBack && (
          <button onClick={onBack} className="text-blue-600 text-sm hover:underline mt-2">
            ← Voltar ao início
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        {onBack && (
          <button onClick={onBack} className="text-blue-600 text-sm hover:underline">
            ←
          </button>
        )}
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900">Confirmar Entrega</h2>
          <p className="text-xs text-gray-500 font-mono">{order.requestProtocol}</p>
        </div>
        <ConnectionStatus online={online} pendingCount={pendingCount} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ── Item Checklist ── */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Checklist de Itens</h3>
          <ul className="flex flex-col gap-2">
            {items.map((s) => (
              <li
                key={s.item.itemId}
                className={`rounded-xl border p-3 ${
                  s.status === 'delivered'
                    ? 'border-green-200 bg-green-50'
                    : s.status === 'missing'
                    ? 'border-red-200 bg-red-50'
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <p className="text-sm font-medium text-gray-900 mb-2">
                  {s.item.productName}
                </p>

                {/* Status selector */}
                <div className="flex gap-2 text-xs mb-2">
                  {(['delivered', 'partial', 'missing'] as DeliveryItemStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => updateItemStatus(s.item.itemId, st)}
                      className={`rounded-full px-2 py-1 border font-medium transition-colors ${
                        s.status === st
                          ? st === 'delivered'
                            ? 'bg-green-500 text-white border-green-500'
                            : st === 'missing'
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-yellow-500 text-white border-yellow-500'
                          : 'bg-white text-gray-600 border-gray-300'
                      }`}
                    >
                      {st === 'delivered' ? '✓ Entregue' : st === 'missing' ? '✗ Faltante' : '~ Parcial'}
                    </button>
                  ))}
                </div>

                {/* Actual qty input (shown for partial delivery) */}
                {s.status === 'partial' && (
                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-gray-600">Qtd entregue:</label>
                    <input
                      type="number"
                      min={0}
                      max={s.item.approvedQuantity}
                      value={s.deliveredQuantity}
                      onChange={(e) => updateDeliveredQty(s.item.itemId, Number(e.target.value))}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <span className="text-gray-400">
                      / {s.item.approvedQuantity} {s.item.unit}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Notes ── */}
        <section>
          <label htmlFor="delivery-notes" className="text-sm font-semibold text-gray-700 block mb-1">
            Observações
          </label>
          <textarea
            id="delivery-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anotações sobre a entrega..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </section>

        {/* ── Signature Pad ── */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-gray-700">
              Assinatura do Recebedor
              <span className="text-red-500 ml-1">*</span>
            </span>
            <button
              onClick={clearSignature}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Limpar
            </button>
          </div>
          <div
            className={`rounded-xl border-2 overflow-hidden ${
              hasSignature ? 'border-green-400' : 'border-gray-300 border-dashed'
            }`}
            style={{ height: 160 }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full touch-none"
              style={{ width: '100%', height: '100%' }}
              aria-label="Área de assinatura"
            />
          </div>
          {!hasSignature && (
            <p className="text-xs text-gray-400 mt-1 text-center">
              Peça ao recebedor para assinar acima
            </p>
          )}
        </section>

        {/* ── Photo capture ── */}
        <section>
          <p className="text-sm font-semibold text-gray-700 mb-1">Foto da Entrega</p>
          {photoBase64 ? (
            <div className="relative">
              <img
                src={`data:image/jpeg;base64,${photoBase64}`}
                alt="Foto da entrega"
                className="w-full rounded-xl object-cover"
                style={{ maxHeight: 200 }}
              />
              <button
                onClick={() => setPhotoBase64(undefined)}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
                aria-label="Remover foto"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
              <span className="text-2xl">📷</span>
              <span className="text-xs text-gray-500 mt-1">Tirar foto (opcional)</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture}
              />
            </label>
          )}
        </section>

        {/* ── Submit ── */}
        <button
          onClick={() => void handleSubmit()}
          disabled={!hasSignature || submitting}
          className="rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting
            ? 'Enviando...'
            : !hasSignature
            ? 'Aguardando assinatura...'
            : !online
            ? '💾 Salvar para Sincronizar'
            : '✅ Confirmar Entrega'}
        </button>
      </div>
    </div>
  );
}
