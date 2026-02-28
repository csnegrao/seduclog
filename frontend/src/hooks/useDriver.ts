import { useCallback, useEffect, useRef, useState } from 'react';
import { authHeaders } from './useRequests';
import {
  DeliveryOrder,
  RouteUpdate,
  Occurrence,
  PickupPayload,
  LocationPayload,
  OccurrencePayload,
  DeliverPayload,
  PendingAction,
} from '../types/driver.types';
import { enqueueAction, getPendingActions, removeAction } from './useOfflineSync';

const API_BASE = process.env.REACT_APP_API_BASE ?? 'http://localhost:3001';

async function handleResponse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error((body as { message?: string }).message ?? 'Request failed');
  return body;
}

export interface UseDriverResult {
  orders: DeliveryOrder[];
  loading: boolean;
  error: string | null;
  online: boolean;
  pendingCount: number;

  fetchOrders: () => Promise<void>;
  pickup: (orderId: string, payload?: PickupPayload) => Promise<DeliveryOrder | null>;
  updateLocation: (orderId: string, payload: LocationPayload) => Promise<RouteUpdate | null>;
  reportOccurrence: (orderId: string, payload: OccurrencePayload) => Promise<Occurrence | null>;
  deliver: (orderId: string, payload: DeliverPayload) => Promise<DeliveryOrder | null>;
  syncPending: () => Promise<void>;
}

export function useDriver(): UseDriverResult {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  // Track online/offline status.
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      void syncPending();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial pending count.
    void getPendingActions().then((actions) => setPendingCount(actions.length));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshPendingCount = useCallback(async () => {
    const actions = await getPendingActions();
    setPendingCount(actions.length);
  }, []);

  /**
   * Generic fetch wrapper.
   * When offline, queues the action in IndexedDB and returns null.
   */
  const safeFetch = useCallback(
    async <T>(
      endpoint: string,
      method: string,
      body?: unknown,
    ): Promise<T | null> => {
      if (!online) {
        // Queue action for later sync.
        const action: PendingAction = {
          id: `${Date.now()}-${Math.random()}`,
          endpoint,
          method,
          body,
          timestamp: Date.now(),
        };
        await enqueueAction(action);
        await refreshPendingCount();
        return null;
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: authHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      return handleResponse<T>(res);
    },
    [online, refreshPendingCount],
  );

  const fetchOrders = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/driver/orders`, {
        headers: authHeaders(),
      });
      const data = await handleResponse<{ orders: DeliveryOrder[] }>(res);
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const pickup = useCallback(
    async (orderId: string, payload: PickupPayload = {}): Promise<DeliveryOrder | null> => {
      const data = await safeFetch<{ order: DeliveryOrder }>(
        `/api/driver/orders/${orderId}/pickup`,
        'PATCH',
        payload,
      );
      if (data) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        return data.order;
      }
      return null;
    },
    [safeFetch, online],
  );

  const updateLocation = useCallback(
    async (orderId: string, payload: LocationPayload): Promise<RouteUpdate | null> => {
      if (!online) {
        // Silently queue location update; no user feedback needed.
        await enqueueAction({
          id: `loc-${Date.now()}`,
          endpoint: `/api/driver/orders/${orderId}/location`,
          method: 'POST',
          body: payload,
          timestamp: Date.now(),
        });
        await refreshPendingCount();
        return null;
      }
      const data = await safeFetch<{ routeUpdate: RouteUpdate }>(
        `/api/driver/orders/${orderId}/location`,
        'POST',
        payload,
      );
      return data?.routeUpdate ?? null;
    },
    [online, safeFetch, refreshPendingCount],
  );

  const reportOccurrence = useCallback(
    async (orderId: string, payload: OccurrencePayload): Promise<Occurrence | null> => {
      const data = await safeFetch<{ occurrence: Occurrence }>(
        `/api/driver/orders/${orderId}/occurrence`,
        'POST',
        payload,
      );
      return data?.occurrence ?? null;
    },
    [safeFetch, online],
  );

  const deliver = useCallback(
    async (orderId: string, payload: DeliverPayload): Promise<DeliveryOrder | null> => {
      const data = await safeFetch<{ order: DeliveryOrder }>(
        `/api/driver/orders/${orderId}/deliver`,
        'POST',
        payload,
      );
      if (data) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        return data.order;
      }
      return null;
    },
    [safeFetch, online],
  );

  /** Replays all queued offline actions in order. */
  const syncPending = useCallback(async (): Promise<void> => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const actions = await getPendingActions();
      for (const action of actions) {
        try {
          const res = await fetch(`${API_BASE}${action.endpoint}`, {
            method: action.method,
            headers: authHeaders(),
            body: action.body !== undefined ? JSON.stringify(action.body) : undefined,
          });
          if (res.ok) {
            await removeAction(action.id);
          }
        } catch {
          // Network still unavailable; stop syncing this batch.
          break;
        }
      }
    } finally {
      syncingRef.current = false;
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  return {
    orders,
    loading,
    error,
    online,
    pendingCount,
    fetchOrders,
    pickup,
    updateLocation,
    reportOccurrence,
    deliver,
    syncPending,
  };
}
