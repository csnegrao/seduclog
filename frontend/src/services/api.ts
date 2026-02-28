import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Typed helpers
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: import('../types').User }>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<import('../types').User>('/auth/me'),
};

export const usersApi = {
  list: () => api.get<import('../types').User[]>('/users'),
  get: (id: string) => api.get<import('../types').User>(`/users/${id}`),
  create: (data: Partial<import('../types').User> & { password: string }) =>
    api.post<import('../types').User>('/users', data),
  update: (id: string, data: Partial<import('../types').User> & { password?: string }) =>
    api.put<import('../types').User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const materialsApi = {
  list: () => api.get<import('../types').Material[]>('/stock/materials'),
  get: (id: string) => api.get<import('../types').Material>(`/stock/materials/${id}`),
  create: (data: Partial<import('../types').Material>) =>
    api.post<import('../types').Material>('/stock/materials', data),
  update: (id: string, data: Partial<import('../types').Material>) =>
    api.put<import('../types').Material>(`/stock/materials/${id}`, data),
  delete: (id: string) => api.delete(`/stock/materials/${id}`),
  alerts: () => api.get<import('../types').Material[]>('/stock/materials/alerts'),
};

export const movementsApi = {
  list: (materialId?: string) =>
    api.get<import('../types').StockMovement[]>('/stock/movements', {
      params: materialId ? { materialId } : undefined,
    }),
  create: (data: {
    materialId: string;
    type: import('../types').MovementType;
    quantity: number;
    reason?: string;
  }) => api.post('/stock/movements', data),
};

export const requestsApi = {
  list: () => api.get<import('../types').MaterialRequest[]>('/requests'),
  get: (id: string) => api.get<import('../types').MaterialRequest>(`/requests/${id}`),
  create: (data: {
    items: { materialId: string; quantity: number }[];
    priority?: string;
    notes?: string;
    destination?: string;
  }) => api.post<import('../types').MaterialRequest>('/requests', data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/requests/${id}/status`, { status, notes }),
  delete: (id: string) => api.delete(`/requests/${id}`),
};

export const ordersApi = {
  list: () => api.get<import('../types').PickingOrder[]>('/orders'),
  get: (id: string) => api.get<import('../types').PickingOrder>(`/orders/${id}`),
  create: (data: { requestId: string; notes?: string }) =>
    api.post<import('../types').PickingOrder>('/orders', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
};

export const deliveriesApi = {
  list: () => api.get<import('../types').Delivery[]>('/deliveries'),
  get: (id: string) => api.get<import('../types').Delivery>(`/deliveries/${id}`),
  create: (data: {
    pickingOrderId: string;
    driverId?: string;
    destination?: string;
    destinationLat?: number;
    destinationLng?: number;
  }) => api.post<import('../types').Delivery>('/deliveries', data),
  updateStatus: (
    id: string,
    status: string,
    location?: { lat: number; lng: number }
  ) =>
    api.patch(`/deliveries/${id}/status`, {
      status,
      ...(location && { currentLat: location.lat, currentLng: location.lng }),
    }),
  saveSignature: (id: string, signatureData: string, recipientName: string) =>
    api.post(`/deliveries/${id}/signature`, { signatureData, recipientName }),
};

export const reportsApi = {
  dashboard: () =>
    api.get<import('../types').DashboardKPIs>('/stock/reports/dashboard'),
};
