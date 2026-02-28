export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  capacity: string;
  available: boolean;
}

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
  eta?: number;
  pickupPhotoUrl?: string;
  deliveryPhotoUrl?: string;
  deliverySignature?: string;
  deliveryNotes?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

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
  timestamp: string;
}

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
  createdAt: string;
  reconciledAt?: string;
}

export interface CreateDeliveryOrderPayload {
  requestId: string;
  driverId: string;
  vehicleId: string;
  estimatedRoute?: string;
}

export interface StockMovementPayload {
  productId: string;
  quantity: number;
  invoiceRef?: string;
  notes?: string;
}

export interface ReconcileInventoryPayload {
  counts: Array<{ productId: string; physicalCount: number }>;
}

export interface DriverOption {
  id: string;
  name: string;
  email: string;
}
