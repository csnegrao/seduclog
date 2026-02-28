import { useCallback, useState } from 'react';
import { authHeaders } from './useRequests';
import {
  DeliveryOrder,
  InventorySession,
  StockMovement,
  CreateDeliveryOrderPayload,
  StockMovementPayload,
  ReconcileInventoryPayload,
  DriverOption,
  Vehicle,
} from '../types/warehouse.types';
import { MaterialRequest, Product } from '../types/request.types';

const API_BASE = process.env.REACT_APP_API_BASE ?? 'http://localhost:3001';

async function handleResponse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error((body as { message?: string }).message ?? 'Request failed');
  return body;
}

export interface UseWarehouseResult {
  loading: boolean;
  error: string | null;

  // Queue
  queue: MaterialRequest[];
  fetchQueue: () => Promise<void>;

  // Delivery orders
  createDeliveryOrder: (payload: CreateDeliveryOrderPayload) => Promise<DeliveryOrder>;
  startPicking: (orderId: string) => Promise<DeliveryOrder>;

  // Stock
  products: Product[];
  fetchStock: (search?: string, category?: string) => Promise<void>;
  fetchStockAlerts: () => Promise<Product[]>;
  registerStockMovement: (payload: StockMovementPayload) => Promise<StockMovement>;

  // Drivers & vehicles
  fetchDriversAndVehicles: () => Promise<{ drivers: DriverOption[]; vehicles: Vehicle[] }>;

  // Inventory
  startInventory: () => Promise<InventorySession>;
  reconcileInventory: (
    sessionId: string,
    payload: ReconcileInventoryPayload,
  ) => Promise<InventorySession>;
}

export function useWarehouse(): UseWarehouseResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<MaterialRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchQueue = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/queue`, {
        headers: authHeaders(),
      });
      const data = await handleResponse<{ queue: MaterialRequest[] }>(res);
      setQueue(data.queue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createDeliveryOrder = useCallback(
    async (payload: CreateDeliveryOrderPayload): Promise<DeliveryOrder> => {
      const res = await fetch(`${API_BASE}/api/warehouse/orders`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse<{ order: DeliveryOrder }>(res);
      return data.order;
    },
    [],
  );

  const startPicking = useCallback(async (orderId: string): Promise<DeliveryOrder> => {
    const res = await fetch(`${API_BASE}/api/warehouse/orders/${orderId}/start-picking`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    const data = await handleResponse<{ order: DeliveryOrder }>(res);
    return data.order;
  }, []);

  const fetchStock = useCallback(
    async (search?: string, category?: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        const qs = params.toString();
        const res = await fetch(
          `${API_BASE}/api/warehouse/stock${qs ? `?${qs}` : ''}`,
          { headers: authHeaders() },
        );
        const data = await handleResponse<{ products: Product[] }>(res);
        setProducts(data.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchStockAlerts = useCallback(async (): Promise<Product[]> => {
    const res = await fetch(`${API_BASE}/api/warehouse/stock/alerts`, {
      headers: authHeaders(),
    });
    const data = await handleResponse<{ alerts: Product[] }>(res);
    return data.alerts;
  }, []);

  const registerStockMovement = useCallback(
    async (payload: StockMovementPayload): Promise<StockMovement> => {
      const res = await fetch(`${API_BASE}/api/warehouse/stock/movement`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse<{ movement: StockMovement }>(res);
      return data.movement;
    },
    [],
  );

  const fetchDriversAndVehicles = useCallback(
    async (): Promise<{ drivers: DriverOption[]; vehicles: Vehicle[] }> => {
      const res = await fetch(`${API_BASE}/api/warehouse/drivers`, {
        headers: authHeaders(),
      });
      const data = await handleResponse<{ drivers: DriverOption[]; vehicles: Vehicle[] }>(res);
      return data;
    },
    [],
  );

  const startInventory = useCallback(async (): Promise<InventorySession> => {
    const res = await fetch(`${API_BASE}/api/warehouse/inventory`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    const data = await handleResponse<{ inventory: InventorySession }>(res);
    return data.inventory;
  }, []);

  const reconcileInventory = useCallback(
    async (
      sessionId: string,
      payload: ReconcileInventoryPayload,
    ): Promise<InventorySession> => {
      const res = await fetch(
        `${API_BASE}/api/warehouse/inventory/${sessionId}/reconcile`,
        {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        },
      );
      const data = await handleResponse<{ inventory: InventorySession }>(res);
      return data.inventory;
    },
    [],
  );

  return {
    loading,
    error,
    queue,
    fetchQueue,
    createDeliveryOrder,
    startPicking,
    products,
    fetchStock,
    fetchStockAlerts,
    registerStockMovement,
    fetchDriversAndVehicles,
    startInventory,
    reconcileInventory,
  };
}
