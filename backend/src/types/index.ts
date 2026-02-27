export type UserRole =
  | 'admin'
  | 'manager'
  | 'driver'
  | 'viewer'
  | 'requester'
  | 'warehouse_operator';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  unit: string;
  stock: number;
  category: string;
}

// ─── Material Requests ────────────────────────────────────────────────────────

export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface RequestItem {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  requestedQuantity: number;
  approvedQuantity?: number;
}

export interface RequestHistoryEntry {
  id: string;
  status: RequestStatus;
  changedBy: string;
  changedByName: string;
  notes?: string;
  timestamp: Date;
}

export interface MaterialRequest {
  id: string;
  protocol: string;
  requesterId: string;
  requesterName: string;
  school: string;
  status: RequestStatus;
  items: RequestItem[];
  desiredDate: Date;
  justification: string;
  history: RequestHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRequestBody {
  school: string;
  desiredDate: string;
  justification: string;
  items: Array<{ productId: string; requestedQuantity: number }>;
}

export interface ApproveRequestBody {
  items?: Array<{ itemId: string; approvedQuantity: number }>;
  notes?: string;
}
