import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeliveryOrder } from '../../types/warehouse.types';
import { OccurrencePayload } from '../../types/driver.types';
import { useDriver } from '../../hooks/useDriver';
import { ConnectionStatus } from './ConnectionStatus';

const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

interface Props {
  order: DeliveryOrder;
  onConfirmDelivery?: (order: DeliveryOrder) => void;
  onBack?: () => void;
}

/**
 * Active delivery screen:
 * - Embeds Google Maps with navigation to destination (static map or link fallback)
 * - Displays real-time ETA (updated via periodic location broadcasts)
 * - Occurrence report button → inline form
 * - Pickup confirmation button (if status === 'created' | 'ready' | 'picking')
 */
export function ActiveDelivery({ order: initialOrder, onConfirmDelivery, onBack }: Props) {
  const { online, pendingCount, pickup, updateLocation, reportOccurrence } = useDriver();

  const [order, setOrder] = useState<DeliveryOrder>(initialOrder);
  const [eta, setEta] = useState<number | undefined>(initialOrder.eta);
  const [showOccurrence, setShowOccurrence] = useState(false);
  const [occurrenceDesc, setOccurrenceDesc] = useState('');
  const [submittingOccurrence, setSubmittingOccurrence] = useState(false);
  const [submittingPickup, setSubmittingPickup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);

  const [gpsError, setGpsError] = useState<string | null>(null);

  // Start broadcasting location when component mounts and GPS is available.
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS não disponível neste dispositivo.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setGpsError(null);
        const { latitude, longitude } = position.coords;
        void updateLocation(order.id, { lat: latitude, lng: longitude }).then((update) => {
          if (update?.eta !== undefined) setEta(update.eta);
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Permissão de localização negada. O ETA não será calculado.');
        } else {
          setGpsError('Não foi possível obter a localização GPS.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const handlePickup = useCallback(async () => {
    setSubmittingPickup(true);
    setError(null);
    try {
      const updated = await pickup(order.id);
      if (updated) {
        setOrder(updated);
        setSuccessMsg('Coleta confirmada!');
      } else if (!online) {
        setSuccessMsg('Confirmação salva localmente. Será sincronizada quando online.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm pickup');
    } finally {
      setSubmittingPickup(false);
    }
  }, [order.id, pickup, online]);

  const handleSubmitOccurrence = useCallback(async () => {
    if (!occurrenceDesc.trim()) return;
    setSubmittingOccurrence(true);
    setError(null);
    try {
      const payload: OccurrencePayload = { description: occurrenceDesc };
      const result = await reportOccurrence(order.id, payload);
      if (result || !online) {
        setOccurrenceDesc('');
        setShowOccurrence(false);
        setSuccessMsg('Ocorrência registrada.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report occurrence');
    } finally {
      setSubmittingOccurrence(false);
    }
  }, [occurrenceDesc, order.id, reportOccurrence, online]);

  const getMapEmbedUrl = () => {
    if (!MAPS_KEY || !order.estimatedRoute) return null;
    const dest = encodeURIComponent(order.estimatedRoute);
    return (
      `https://www.google.com/maps/embed/v1/directions` +
      `?key=${MAPS_KEY}&destination=${dest}&mode=driving`
    );
  };

  const getMapsLink = () => {
    if (!order.estimatedRoute) return null;
    const dest = encodeURIComponent(order.estimatedRoute);
    return `https://maps.google.com/?daddr=${dest}`;
  };

  const mapEmbedUrl = getMapEmbedUrl();
  const mapsLink = getMapsLink();

  const canPickup =
    order.status === 'created' || order.status === 'picking' || order.status === 'ready';
  const canDeliver = order.status === 'in_transit';

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
          <h2 className="text-base font-semibold text-gray-900">{order.school}</h2>
          <p className="text-xs text-gray-500 font-mono">{order.requestProtocol}</p>
        </div>
        <ConnectionStatus online={online} pendingCount={pendingCount} />
      </div>

      {/* Map */}
      <div className="relative bg-gray-200" style={{ height: 240 }}>
        {mapEmbedUrl ? (
          <iframe
            src={mapEmbedUrl}
            className="w-full h-full border-0"
            title="Mapa de navegação"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 text-sm">
            <span className="text-4xl">🗺</span>
            <p>{order.estimatedRoute ?? 'Destino não definido'}</p>
            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Abrir no Google Maps
              </a>
            )}
          </div>
        )}

        {/* ETA badge */}
        {eta !== undefined && (
          <div className="absolute bottom-3 left-3 bg-white rounded-full shadow px-3 py-1 text-sm font-medium text-blue-700">
            ⏱ ETA: {eta} min
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {gpsError && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-yellow-700 text-sm">
            📍 {gpsError}
          </div>
        )}

        {successMsg && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-green-700 text-sm">
            {successMsg}
          </div>
        )}

        {/* Order info */}
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-500">Motorista</p>
              <p className="font-medium">{order.driverName}</p>
            </div>
            <div>
              <p className="text-gray-500">Veículo</p>
              <p className="font-medium">{order.vehiclePlate}</p>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Itens</p>
            <ul className="space-y-0.5">
              {order.picklist.map((item) => (
                <li key={item.itemId} className="flex justify-between text-xs">
                  <span>{item.productName}</span>
                  <span className="text-gray-500">
                    {item.approvedQuantity} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pickup button */}
        {canPickup && (
          <button
            onClick={() => void handlePickup()}
            disabled={submittingPickup}
            className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submittingPickup ? 'Confirmando...' : '📦 Confirmar Coleta no Almoxarifado'}
          </button>
        )}

        {/* Confirm delivery button */}
        {canDeliver && (
          <button
            onClick={() => onConfirmDelivery?.(order)}
            className="rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            ✅ Confirmar Entrega
          </button>
        )}

        {/* Occurrence form toggle */}
        <button
          onClick={() => setShowOccurrence((v) => !v)}
          className="rounded-md border border-orange-300 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
        >
          ⚠️ {showOccurrence ? 'Cancelar' : 'Registrar Ocorrência'}
        </button>

        {/* Occurrence form */}
        {showOccurrence && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex flex-col gap-3">
            <textarea
              value={occurrenceDesc}
              onChange={(e) => setOccurrenceDesc(e.target.value)}
              placeholder="Descreva a ocorrência..."
              rows={3}
              className="rounded-md border border-orange-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={() => void handleSubmitOccurrence()}
              disabled={submittingOccurrence || !occurrenceDesc.trim()}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {submittingOccurrence ? 'Enviando...' : 'Enviar Ocorrência'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
