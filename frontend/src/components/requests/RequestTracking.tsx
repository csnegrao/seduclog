import React, { useEffect } from 'react';
import { useTracking } from '../../hooks/useTracking';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { StatusTimeline } from './StatusTimeline';
import { TrackingMap } from './TrackingMap';
import { RequestStatus } from '../../types/request.types';

interface Props {
  requestId: string;
  onBack?: () => void;
}

const HUMAN_STATUS: Record<RequestStatus, string> = {
  pending:     'Pendente',
  approved:    'Aprovado',
  in_progress: 'Em Separação',
  in_transit:  'Em Trânsito',
  delivered:   'Entregue',
  cancelled:   'Cancelado',
};

/**
 * Real-time tracking screen embedded in the request detail page.
 *
 * Features:
 *  - StatusTimeline: visual step indicator
 *  - TrackingMap: Google Maps embed (or text fallback) with live driver marker
 *  - ETA updated in real-time from "driver:location" socket events
 *  - Push notification setup: prompts on first access, sends notification on
 *    delivery status changes
 */
export function RequestTracking({ requestId, onBack }: Props) {
  const { tracking, loading, error, livePosition, delivered } = useTracking(requestId);
  const { permission, subscribing, requestPermission, notify } =
    usePushNotifications();

  // ── Request push permission on first mount if not yet decided ──────────────
  useEffect(() => {
    if (permission === 'default') {
      void requestPermission();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // ── Send push notification when delivery is confirmed ──────────────────────
  useEffect(() => {
    if (!delivered) return;
    notify(
      'Entrega Confirmada! 🏫',
      `Seu pedido ${tracking?.order?.requestProtocol ?? ''} foi entregue.`,
      `delivery-${requestId}`,
    );
  }, [delivered, notify, requestId, tracking?.order?.requestProtocol]);

  // ── Send push notification when status changes to in_transit ───────────────
  const currentStatus = tracking?.requestStatus;
  const orderProtocol = tracking?.order?.requestProtocol;

  useEffect(() => {
    if (currentStatus !== 'in_transit') return;
    notify(
      'Pedido Despachado! 🚐',
      `Seu pedido ${orderProtocol ?? ''} está a caminho.`,
      `dispatch-${requestId}`,
    );
  }, [currentStatus, orderProtocol, notify, requestId]);

  const showTrackable =
    tracking &&
    (tracking.requestStatus === 'in_transit' || tracking.requestStatus === 'delivered');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        {onBack && (
          <button onClick={onBack} className="text-blue-600 text-sm hover:underline">
            ←
          </button>
        )}
        <h2 className="flex-1 text-base font-semibold text-gray-900">
          Rastreamento de Pedido
        </h2>

        {/* Notification permission prompt */}
        {permission === 'default' && (
          <button
            onClick={() => void requestPermission()}
            disabled={subscribing}
            className="text-xs text-blue-600 hover:underline"
          >
            {subscribing ? 'Ativando...' : '🔔 Ativar notificações'}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 bg-gray-50">
        {/* Loading */}
        {loading && (
          <p className="text-center text-gray-400 py-8 text-sm">Carregando...</p>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Delivered banner */}
        {delivered && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <p className="font-semibold text-green-800">Entregue com sucesso!</p>
              <p className="text-sm text-green-700">
                Seu pedido foi entregue em {tracking?.order?.school ?? ''}.
              </p>
            </div>
          </div>
        )}

        {!loading && tracking && (
          <>
            {/* Status timeline */}
            <section className="rounded-xl bg-white border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase text-gray-500 tracking-wide mb-4">
                Status
              </p>
              <StatusTimeline status={tracking.requestStatus} />
              <p className="mt-3 text-right text-xs text-gray-400">
                Status atual:{' '}
                <span className="font-medium text-gray-700">
                  {HUMAN_STATUS[tracking.requestStatus]}
                </span>
              </p>
            </section>

            {/* Delivery order info */}
            {tracking.order && (
              <section className="rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Motorista</p>
                    <p className="font-medium text-gray-900">{tracking.order.driverName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Veículo</p>
                    <p className="font-medium text-gray-900">{tracking.order.vehiclePlate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Protocolo</p>
                    <p className="font-mono font-medium text-gray-900 text-xs">
                      {tracking.order.requestProtocol}
                    </p>
                  </div>
                  {(livePosition?.eta ?? tracking.order.eta) !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500">ETA</p>
                      <p className="font-semibold text-blue-600">
                        ⏱ {livePosition?.eta ?? tracking.order.eta} min
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Map (only when in_transit or delivered) */}
            {showTrackable && tracking.order && (
              <section>
                <p className="text-xs font-semibold uppercase text-gray-500 tracking-wide mb-2">
                  Localização em Tempo Real
                </p>
                <TrackingMap
                  order={tracking.order}
                  driverPosition={livePosition}
                />
              </section>
            )}

            {/* Pending / approved message when delivery hasn't started */}
            {!showTrackable && !delivered && (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800 flex items-start gap-3">
                <span className="text-xl">⏳</span>
                <p>
                  {tracking.requestStatus === 'in_progress'
                    ? 'O pedido está sendo separado no almoxarifado. O mapa de rastreamento aparecerá quando o motorista partir.'
                    : 'Aguardando início do processamento do pedido.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
