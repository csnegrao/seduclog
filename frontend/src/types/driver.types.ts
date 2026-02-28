import { DeliveryOrder } from './warehouse.types';

export type { DeliveryOrder };

export interface RouteUpdate {
  id: string;
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  eta?: number;
  timestamp: string;
}

export interface Occurrence {
  id: string;
  orderId: string;
  driverId: string;
  driverName: string;
  description: string;
  photoUrl?: string;
  timestamp: string;
}

export type DeliveryItemStatus = 'delivered' | 'missing' | 'partial';

export interface DeliveryItemResult {
  itemId: string;
  status: DeliveryItemStatus;
  deliveredQuantity: number;
}

export interface PickupPayload {
  photoBase64?: string;
}

export interface LocationPayload {
  lat: number;
  lng: number;
}

export interface OccurrencePayload {
  description: string;
  photoBase64?: string;
}

export interface DeliverPayload {
  items: DeliveryItemResult[];
  notes?: string;
  signatureBase64: string;
  photoBase64?: string;
}

/** Pending action stored in IndexedDB for offline sync. */
export interface PendingAction {
  id: string;
  endpoint: string;
  method: string;
  body: unknown;
  timestamp: number;
}
