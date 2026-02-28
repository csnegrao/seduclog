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
import { Role, RequestStatus, OrderStatus, DeliveryStatus, MovementType, Priority } from '@prisma/client';

export { Role, RequestStatus, OrderStatus, DeliveryStatus, MovementType, Priority };

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
  school: string;
  deliveryAddress?: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  status: DeliveryOrderStatus;
  picklist: PicklistItem[];
  estimatedRoute?: string;
  eta?: number; // minutes
  pickupPhotoUrl?: string;
  deliveryPhotoUrl?: string;
  deliverySignature?: string;
  deliveryNotes?: string;
  deliveredAt?: Date;
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

// ─── Driver ───────────────────────────────────────────────────────────────────

export interface RouteUpdate {
  id: string;
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  eta?: number; // minutes
  timestamp: Date;
}

export interface Occurrence {
  id: string;
  orderId: string;
  driverId: string;
  driverName: string;
  description: string;
  photoUrl?: string;
  timestamp: Date;
}

export type DeliveryItemStatus = 'delivered' | 'missing' | 'partial';

export interface DeliveryItemResult {
  itemId: string;
  status: DeliveryItemStatus;
  deliveredQuantity: number;
}

export interface PickupBody {
  photoBase64?: string;
}

export interface LocationBody {
  lat: number;
  lng: number;
}

export interface OccurrenceBody {
  description: string;
  photoBase64?: string;
}

export interface DeliverBody {
  items: DeliveryItemResult[];
  notes?: string;
  signatureBase64: string;
  photoBase64?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationEvent =
  | 'request_approved'
  | 'request_cancelled'
  | 'order_dispatched'
  | 'driver_arriving'
  | 'delivery_confirmed'
  | 'stock_below_minimum';

export interface Notification {
  id: string;
  userId: string;
  event: NotificationEvent;
  title: string;
  body: string;
  /** Optional reference ID (requestId, orderId, productId, …). */
  referenceId?: string;
  read: boolean;
  createdAt: Date;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  createdAt: Date;
}

export interface SendMessageBody {
  text: string;
  role: Role;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
