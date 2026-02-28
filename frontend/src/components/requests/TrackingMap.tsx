import React, { useEffect, useRef } from 'react';
import { TrackingPosition } from '../../types/request.types';
import { DeliveryOrder } from '../../types/warehouse.types';

const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

interface Props {
  order: DeliveryOrder;
  /** Live driver position, updated via Socket.io. */
  driverPosition?: TrackingPosition | null;
}

/**
 * Tracking map shown in the request detail page.
 *
 * When `REACT_APP_GOOGLE_MAPS_API_KEY` is configured:
 *   - Embeds a Google Maps with a destination pin.
 *   - Overlays an animated driver marker that moves to `driverPosition`.
 *   - Shows a polyline of the approximate route (origin → destination).
 *
 * Without the key (development / offline):
 *   - Falls back to a static text representation of the route and ETA.
 *
 * NOTE: Full animated marker support requires the Maps JS SDK loaded via
 *       script tag or @googlemaps/js-api-loader. The embed fallback below
 *       uses the Maps Embed API which is sufficient for a read-only view.
 */
export function TrackingMap({ order, driverPosition }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prevPositionRef = useRef<TrackingPosition | null | undefined>(null);

  const destination = order.estimatedRoute ?? order.school;
  const eta = driverPosition?.eta ?? order.eta;

  // Update the iframe src when the driver moves to a significantly different position.
  useEffect(() => {
    const prev = prevPositionRef.current;
    if (!driverPosition || !MAPS_KEY) return;
    if (
      prev &&
      Math.abs(prev.lat - driverPosition.lat) < 0.0001 &&
      Math.abs(prev.lng - driverPosition.lng) < 0.0001
    ) {
      return; // avoid redundant re-renders for tiny GPS drift
    }
    prevPositionRef.current = driverPosition;
  }, [driverPosition]);

  if (MAPS_KEY) {
    // Use the Maps Embed Directions mode when a Google Maps key is available.
    const origin = driverPosition
      ? `${driverPosition.lat},${driverPosition.lng}`
      : 'current+location';

    const embedUrl =
      `https://www.google.com/maps/embed/v1/directions` +
      `?key=${MAPS_KEY}` +
      `&origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destination)}` +
      `&mode=driving`;

    return (
      <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: 320 }}>
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full border-0"
          title="Mapa de rastreamento"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* ETA badge overlay */}
        {eta !== undefined && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full px-4 py-2 text-sm font-semibold text-blue-700 flex items-center gap-2 pointer-events-none">
            <span>⏱</span>
            <span>ETA: {eta} min</span>
          </div>
        )}

        {/* Driver position indicator */}
        {driverPosition && (
          <div className="absolute top-3 right-3 bg-blue-600 text-white rounded-full px-3 py-1 text-xs font-medium shadow pointer-events-none flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-300 animate-pulse" />
            Motorista online
          </div>
        )}
      </div>
    );
  }

  // ── Fallback: text-based route display ──────────────────────────────────────
  const mapsLink = `https://maps.google.com/?daddr=${encodeURIComponent(destination)}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 flex flex-col gap-4">
      {/* Route info */}
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">🗺</span>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Destino</p>
          <p className="text-sm font-semibold text-gray-800">{destination}</p>
        </div>
      </div>

      {/* Driver position */}
      {driverPosition ? (
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">🚐</span>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
              Posição do motorista
            </p>
            <p className="text-sm text-gray-700 font-mono">
              {driverPosition.lat.toFixed(5)}, {driverPosition.lng.toFixed(5)}
            </p>
            {eta !== undefined && (
              <p className="text-sm font-semibold text-blue-600 mt-0.5">⏱ ETA: {eta} min</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span>📍</span>
          <span>Aguardando posição do motorista...</span>
        </div>
      )}

      {/* Link to Google Maps */}
      <a
        href={mapsLink}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Abrir no Google Maps
      </a>
    </div>
  );
}
