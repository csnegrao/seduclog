import { useCallback, useState } from 'react';
import {
  MaterialRequest,
  Product,
  CreateRequestPayload,
  ApproveRequestPayload,
  RequestFilters,
} from '../types/request.types';

const ACCESS_TOKEN_KEY = 'seduclog_access_token';
const API_BASE = process.env.REACT_APP_API_BASE ?? 'http://localhost:3001';

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error((body as { message?: string }).message ?? 'Request failed');
  return body;
}

export interface UseRequestsResult {
  requests: MaterialRequest[];
  loading: boolean;
  error: string | null;
  fetchRequests: (filters?: RequestFilters) => Promise<void>;
  fetchRequest: (id: string) => Promise<MaterialRequest>;
  fetchProducts: () => Promise<Product[]>;
  createRequest: (payload: CreateRequestPayload) => Promise<MaterialRequest>;
  approveRequest: (id: string, payload?: ApproveRequestPayload) => Promise<MaterialRequest>;
  cancelRequest: (id: string, notes?: string) => Promise<MaterialRequest>;
  patchRequest: (updated: MaterialRequest) => void;
}

export function useRequests(): UseRequestsResult {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async (filters: RequestFilters = {}): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, v);
      });
      const qs = params.toString();
      const res = await fetch(`${API_BASE}/api/requests${qs ? `?${qs}` : ''}`, {
        headers: authHeaders(),
      });
      const data = await handleResponse<{ requests: MaterialRequest[] }>(res);
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequest = useCallback(async (id: string): Promise<MaterialRequest> => {
    const res = await fetch(`${API_BASE}/api/requests/${id}`, {
      headers: authHeaders(),
    });
    const data = await handleResponse<{ request: MaterialRequest }>(res);
    return data.request;
  }, []);

  const fetchProducts = useCallback(async (): Promise<Product[]> => {
    const res = await fetch(`${API_BASE}/api/products`, { headers: authHeaders() });
    const data = await handleResponse<{ products: Product[] }>(res);
    return data.products;
  }, []);

  const createRequest = useCallback(
    async (payload: CreateRequestPayload): Promise<MaterialRequest> => {
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse<{ request: MaterialRequest }>(res);
      return data.request;
    },
    [],
  );

  const approveRequest = useCallback(
    async (id: string, payload: ApproveRequestPayload = {}): Promise<MaterialRequest> => {
      const res = await fetch(`${API_BASE}/api/requests/${id}/approve`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse<{ request: MaterialRequest }>(res);
      return data.request;
    },
    [],
  );

  const cancelRequest = useCallback(
    async (id: string, notes?: string): Promise<MaterialRequest> => {
      const res = await fetch(`${API_BASE}/api/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ notes }),
      });
      const data = await handleResponse<{ request: MaterialRequest }>(res);
      return data.request;
    },
    [],
  );

  /** Updates a single request in the local list without a network call. */
  const patchRequest = useCallback((updated: MaterialRequest): void => {
    setRequests((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
  }, []);

  return {
    requests,
    loading,
    error,
    fetchRequests,
    fetchRequest,
    fetchProducts,
    createRequest,
    approveRequest,
    cancelRequest,
    patchRequest,
  };
}
