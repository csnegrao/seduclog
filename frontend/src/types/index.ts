export type Role = 'ADMIN' | 'WAREHOUSE_OPERATOR' | 'DRIVER' | 'REQUESTER' | 'MANAGER';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'IN_PICKING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type DeliveryStatus = 'PENDING' | 'EN_ROUTE' | 'ARRIVED' | 'DELIVERED' | 'FAILED';
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type InventoryStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

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

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  capacity?: string;
  active: boolean;
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
  createdAt: string;
}

export interface RequestItem {
  id: string;
  requestId: string;
  materialId: string;
  material?: Pick<Material, 'id' | 'name' | 'unit'>;
  quantity: number;
  fulfilledQty: number;
  notes?: string;
}

export interface MaterialRequest {
  id: string;
  requesterId: string;
  requester?: Pick<User, 'id' | 'name' | 'email' | 'school'>;
  status: RequestStatus;
  priority: Priority;
  notes?: string;
  destination?: string;
  desiredDate?: string;
  createdAt: string;
  updatedAt: string;
  items: RequestItem[];
  pickingOrder?: PickingOrder;
}

export interface ChecklistItem {
  id: string;
  pickingOrderId: string;
  materialId: string;
  material?: Pick<Material, 'id' | 'name' | 'unit'>;
  requiredQty: number;
  confirmedQty: number;
  confirmed: boolean;
  confirmedAt?: string;
}

export interface PickingOrder {
  id: string;
  requestId: string;
  request?: MaterialRequest;
  operatorId?: string;
  operator?: Pick<User, 'id' | 'name'>;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  delivery?: Delivery;
  checklistItems?: ChecklistItem[];
}

export interface Delivery {
  id: string;
  pickingOrderId: string;
  driverId?: string;
  driver?: Pick<User, 'id' | 'name' | 'phone'>;
  vehicleId?: string;
  vehicle?: Vehicle;
  status: DeliveryStatus;
  destination?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  materialId: string;
  material?: Pick<Material, 'id' | 'name' | 'unit'>;
  type: MovementType;
  quantity: number;
  reason?: string;
  reference?: string;
  invoiceRef?: string;
  userId: string;
  user?: Pick<User, 'id' | 'name'>;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  materialId: string;
  material?: Pick<Material, 'id' | 'name' | 'unit' | 'category'>;
  systemQty: number;
  physicalQty?: number;
  adjustment?: number;
  reconciled: boolean;
}

export interface InventorySession {
  id: string;
  operatorId: string;
  operator?: Pick<User, 'id' | 'name'>;
  status: InventoryStatus;
  notes?: string;
  createdAt: string;
  closedAt?: string;
  items: InventoryItem[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
