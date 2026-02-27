export type DeliveryOrderStatus = 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'PARTIAL';
export type ChecklistStatus = 'DELIVERED' | 'MISSING' | 'DIFFERENT_QTY';

export interface School {
  id: string;
  name: string;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
}

export interface RequestItem {
  id: string;
  product: Product;
  quantity: number;
  deliveredQty: number;
}

export interface MaterialRequest {
  id: string;
  school: School;
  requestItems: RequestItem[];
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
}

export interface RouteUpdate {
  id: string;
  lat: number;
  lng: number;
  estimatedArrival?: string;
  createdAt: string;
}

export interface DeliveryOrder {
  id: string;
  status: DeliveryOrderStatus;
  materialRequest: MaterialRequest;
  vehicle: Vehicle;
  routeUpdates: RouteUpdate[];
  notes?: string;
}

export interface ChecklistItem {
  requestItemId: string;
  status: ChecklistStatus;
  actualQty?: number;
}

export interface DeliverPayload {
  checklist: ChecklistItem[];
  notes?: string;
  signature: string;
  photo?: File;
}
