import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { authHeaders } from './useRequests';
import { TrackingInfo, TrackingPosition } from '../types/request.types';

const API_BASE = process.env.REACT_APP_API_BASE ?? 'http://localhost:3001';

export interface DriverLocationPayload {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  eta?: number;
}

export interface DeliveryConfirmedPayload {
  orderId: string;
  requestId: string;
}

export interface UseTrackingResult {
  tracking: TrackingInfo | null;
  loading: boolean;
  error: string | null;
  /** Latest driver position, kept in sync via Socket.io events. */
  livePosition: TrackingPosition | null;
  /** True once the delivery:confirmed event fires for this request. */
  delivered: boolean;
}

/**
 * Fetches initial tracking data for a request via REST, then subscribes to
 * real-time Socket.io events for the delivery room so that driver position
 * and ETA are updated without polling.
 *
 * @param requestId - The material request ID to track.
 */
export function useTracking(requestId: string): UseTrackingResult {
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [livePosition, setLivePosition] = useState<TrackingPosition | null>(null);
  const [delivered, setDelivered] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // ── Fetch initial tracking snapshot ────────────────────────────────────────
  const fetchTracking = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/api/requests/${requestId}/tracking`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? 'Failed to fetch tracking');
      }
      const data = (await res.json()) as { tracking: TrackingInfo };
      setTracking(data.tracking);
      if (data.tracking.position) {
        setLivePosition(data.tracking.position);
      }
      if (data.tracking.requestStatus === 'delivered') {
        setDelivered(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void fetchTracking();
  }, [fetchTracking]);

  // ── Join Socket.io delivery room for real-time updates ─────────────────────
  const orderId = tracking?.order?.id;

  useEffect(() => {
    if (!orderId) return;

    const socket: Socket = io(API_BASE, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:delivery', orderId);
    });

    socket.on('driver:location', (payload: DriverLocationPayload) => {
      if (payload.orderId !== orderId) return;
      setLivePosition({ lat: payload.lat, lng: payload.lng, eta: payload.eta });
    });

    socket.on('delivery:confirmed', (payload: DeliveryConfirmedPayload) => {
      if (payload.requestId !== requestId) return;
      setDelivered(true);
      setTracking((prev) =>
        prev ? { ...prev, requestStatus: 'delivered' } : prev,
      );
    });

    return () => {
      socket.emit('leave:delivery', orderId);
      socket.disconnect();
    };
  }, [orderId, requestId]);

  return { tracking, loading, error, livePosition, delivered };
}
