import { getPendingActions, removePendingAction, CachedOrder } from './offlineDB';
import { DeliveryOrder } from '../types/driver.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function syncPendingActions(accessToken: string): Promise<void> {
  const pending = await getPendingActions();
  if (pending.length === 0) return;

  for (const action of pending) {
    try {
      let url = `${API_BASE}/api/driver/orders/${action.orderId}`;
      let method = 'POST';

      if (action.type === 'pickup') {
        url += '/pickup';
        method = 'PATCH';
      } else if (action.type === 'location') {
        url += '/location';
      } else if (action.type === 'occurrence') {
        url += '/occurrence';
      } else if (action.type === 'deliver') {
        url += '/deliver';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(action.payload),
      });

      if (res.ok) {
        await removePendingAction(action.id);
      }
    } catch {
      // Keep in queue - will retry on next sync
    }
  }
}

export async function fetchOrdersWithFallback(
  accessToken: string,
  getCached: () => Promise<CachedOrder[]>,
  cacheOrders: (orders: CachedOrder[]) => Promise<void>,
): Promise<DeliveryOrder[]> {
  try {
    const res = await fetch(`${API_BASE}/api/driver/orders`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json() as { orders: DeliveryOrder[] };
    await cacheOrders(data.orders as unknown as CachedOrder[]);
    return data.orders;
  } catch {
    const cached = await getCached();
    return cached as unknown as DeliveryOrder[];
  }
}
