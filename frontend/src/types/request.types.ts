export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface Product {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  category: string;
}

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
  timestamp: string;
}

export interface MaterialRequest {
  id: string;
  protocol: string;
  requesterId: string;
  requesterName: string;
  school: string;
  status: RequestStatus;
  items: RequestItem[];
  desiredDate: string;
  justification: string;
  history: RequestHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestPayload {
  school: string;
  desiredDate: string;
  justification: string;
  items: Array<{ productId: string; requestedQuantity: number }>;
}

export interface ApproveRequestPayload {
  items?: Array<{ itemId: string; approvedQuantity: number }>;
  notes?: string;
}

export interface RequestFilters {
  status?: RequestStatus;
  school?: string;
  from?: string;
  to?: string;
  requesterId?: string;
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

export interface TrackingPosition {
  lat: number;
  lng: number;
  eta?: number;
}

export interface TrackingInfo {
  requestId: string;
  requestStatus: RequestStatus;
  order: import('./warehouse.types').DeliveryOrder | null;
  position: TrackingPosition | null;
}
