export type Role = 'ADMIN' | 'WAREHOUSE_OPERATOR' | 'DRIVER' | 'REQUESTER' | 'MANAGER';

export type RequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  school?: string;
  sector?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

export interface Material {
  id: string;
  name: string;
  description?: string;
  unit: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  sku?: string;
  active: boolean;
}

export interface RequestItem {
  id: string;
  requestId: string;
  materialId: string;
  material?: Pick<Material, 'id' | 'name' | 'unit' | 'currentStock'>;
  requestedQty: number;
  approvedQty?: number;
  notes?: string;
}

export interface RequestHistoryEntry {
  id: string;
  requestId: string;
  userId: string;
  user?: Pick<User, 'id' | 'name'>;
  status: RequestStatus;
  notes?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  requestId: string;
  senderId: string;
  sender?: Pick<User, 'id' | 'name' | 'role'>;
  body: string;
  createdAt: string;
}

export interface MaterialRequest {
  id: string;
  protocol: string;
  requesterId: string;
  requester?: Pick<User, 'id' | 'name' | 'email' | 'school'>;
  status: RequestStatus;
  desiredDate: string;
  justification: string;
  notes?: string;
  driverLat?: number;
  driverLng?: number;
  createdAt: string;
  updatedAt: string;
  items: RequestItem[];
  history?: RequestHistoryEntry[];
  messages?: Message[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
