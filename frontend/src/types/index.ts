export type Role = 'ADMIN' | 'WAREHOUSE_OPERATOR' | 'DRIVER' | 'REQUESTER' | 'MANAGER';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'IN_PICKING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type DeliveryStatus = 'PENDING' | 'EN_ROUTE' | 'ARRIVED' | 'DELIVERED' | 'FAILED';
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

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
  createdAt: string;
  updatedAt: string;
  items: RequestItem[];
  pickingOrder?: PickingOrder;
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
}

export interface Delivery {
  id: string;
  pickingOrderId: string;
  pickingOrder?: PickingOrder;
  driverId?: string;
  driver?: Pick<User, 'id' | 'name' | 'phone'>;
  status: DeliveryStatus;
  destination?: string;
  destinationLat?: number;
  destinationLng?: number;
  currentLat?: number;
  currentLng?: number;
  startedAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
  signatureUrl?: string;
  signatureData?: string;
  recipientName?: string;
  notes?: string;
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
  userId: string;
  user?: Pick<User, 'id' | 'name'>;
  createdAt: string;
}

export interface DashboardKPIs {
  totalRequests: number;
  pendingRequests: number;
  inPickingOrders: number;
  activeDeliveries: number;
  deliveredToday: number;
  lowStockCount: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
