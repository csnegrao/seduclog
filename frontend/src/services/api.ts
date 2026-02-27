import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
  logout: () => api.post('/auth/logout'),
  me: () => api.get<import('../types').User>('/auth/me'),
};

export const materialsApi = {
  list: () => api.get<import('../types').Material[]>('/stock/materials'),
  get: (id: string) => api.get<import('../types').Material>(`/stock/materials/${id}`),
};

export const requestsApi = {
  list: (params?: {
    status?: string;
    school?: string;
    requesterId?: string;
    from?: string;
    to?: string;
  }) =>
    api.get<import('../types').MaterialRequest[]>('/requests', { params }),

  get: (id: string) =>
    api.get<import('../types').MaterialRequest>(`/requests/${id}`),

  create: (data: {
    items: { materialId: string; requestedQty: number; notes?: string }[];
    desiredDate: string;
    justification: string;
    notes?: string;
  }) => api.post<import('../types').MaterialRequest>('/requests', data),

  approve: (
    id: string,
    data?: {
      items?: { id: string; approvedQty: number }[];
      notes?: string;
    }
  ) => api.patch<import('../types').MaterialRequest>(`/requests/${id}/approve`, data ?? {}),

  cancel: (id: string, notes?: string) =>
    api.patch<import('../types').MaterialRequest>(`/requests/${id}/cancel`, { notes }),

  updateStatus: (
    id: string,
    status: string,
    extra?: { notes?: string; driverLat?: number; driverLng?: number }
  ) => api.patch<import('../types').MaterialRequest>(`/requests/${id}/status`, { status, ...extra }),

  addMessage: (id: string, body: string) =>
    api.post<import('../types').Message>(`/requests/${id}/messages`, { body }),
};
