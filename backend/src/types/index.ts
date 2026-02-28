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
  minStock: number;
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

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  capacity: string;
  available: boolean;
}

// ─── Delivery Orders ──────────────────────────────────────────────────────────

export type DeliveryOrderStatus = 'created' | 'picking' | 'ready' | 'in_transit' | 'delivered';

export interface PicklistItem {
  itemId: string;
  productId: string;
  productName: string;
  unit: string;
  approvedQuantity: number;
  pickedQuantity?: number;
  confirmed: boolean;
}

export interface DeliveryOrder {
  id: string;
  requestId: string;
  requestProtocol: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  status: DeliveryOrderStatus;
  picklist: PicklistItem[];
  estimatedRoute?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryOrderBody {
  requestId: string;
  driverId: string;
  vehicleId: string;
  estimatedRoute?: string;
}

// ─── Stock Movements ──────────────────────────────────────────────────────────

export type StockMovementType = 'entry' | 'exit' | 'adjustment';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  invoiceRef?: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
  timestamp: Date;
}

export interface StockMovementBody {
  productId: string;
  quantity: number;
  invoiceRef?: string;
  notes?: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export type InventoryStatus = 'open' | 'reconciled';

export interface InventoryItem {
  productId: string;
  productName: string;
  systemStock: number;
  physicalCount?: number;
  adjustment?: number;
}

export interface InventorySession {
  id: string;
  status: InventoryStatus;
  items: InventoryItem[];
  startedBy: string;
  startedByName: string;
  reconciledBy?: string;
  reconciledByName?: string;
  createdAt: Date;
  reconciledAt?: Date;
}

export interface ReconcileInventoryBody {
  counts: Array<{ productId: string; physicalCount: number }>;
}
