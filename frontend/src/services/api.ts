import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: import('../types').User }>('/auth/login', { email, password }),
  me: () => api.get<import('../types').User>('/auth/me'),
};

export const usersApi = {
  list: () => api.get<import('../types').User[]>('/users'),
  get: (id: string) => api.get<import('../types').User>(`/users/${id}`),
  create: (data: Partial<import('../types').User> & { password: string }) =>
    api.post<import('../types').User>('/users', data),
  update: (id: string, data: Partial<import('../types').User> & { password?: string }) =>
    api.put<import('../types').User>(`/users/${id}`, data),
};

export const warehouseApi = {
  // Queue
  getQueue: () => api.get<import('../types').MaterialRequest[]>('/warehouse/queue'),

  // Orders
  createOrder: (data: { requestId: string; driverId?: string; vehicleId?: string; destination?: string; notes?: string }) =>
    api.post<import('../types').PickingOrder>('/warehouse/orders', data),
  startPicking: (id: string) =>
    api.patch<import('../types').PickingOrder>(`/warehouse/orders/${id}/start-picking`),
  confirmChecklistItem: (orderId: string, itemId: string, confirmedQty: number) =>
    api.patch<import('../types').ChecklistItem>(`/warehouse/orders/${orderId}/checklist/${itemId}`, { confirmedQty }),

  // Stock
  getStock: () => api.get<import('../types').Material[]>('/warehouse/stock'),
  createMovement: (data: { materialId: string; type: import('../types').MovementType; quantity: number; reason?: string; reference?: string; invoiceRef?: string }) =>
    api.post('/warehouse/stock/movement', data),
  getAlerts: () => api.get<import('../types').Material[]>('/warehouse/stock/alerts'),

  // Inventory
  listInventory: () => api.get<import('../types').InventorySession[]>('/warehouse/inventory'),
  startInventory: (notes?: string) => api.post<import('../types').InventorySession>('/warehouse/inventory', { notes }),
  getInventory: (id: string) => api.get<import('../types').InventorySession>(`/warehouse/inventory/${id}`),
  reconcileInventory: (id: string, items: { itemId: string; physicalQty: number }[]) =>
    api.patch<import('../types').InventorySession>(`/warehouse/inventory/${id}/reconcile`, { items }),

  // Resources
  getVehicles: () => api.get<import('../types').Vehicle[]>('/warehouse/vehicles'),
  getDrivers: () => api.get<import('../types').User[]>('/warehouse/drivers'),
};

export const requestsApi = {
  list: () => api.get<import('../types').MaterialRequest[]>('/requests'),
  get: (id: string) => api.get<import('../types').MaterialRequest>(`/requests/${id}`),
  create: (data: { items: { materialId: string; quantity: number }[]; priority?: string; notes?: string; destination?: string; desiredDate?: string }) =>
    api.post<import('../types').MaterialRequest>('/requests', data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/requests/${id}/status`, { status, notes }),
};
