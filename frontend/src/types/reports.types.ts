// ─── Summary ──────────────────────────────────────────────────────────────────

export interface DailyVolumeEntry {
  date: string;
  count: number;
}

export interface SummaryReport {
  totalRequests: number;
  byStatus: Record<string, number>;
  dailyVolume: DailyVolumeEntry[];
}

// ─── Deliveries ───────────────────────────────────────────────────────────────

export interface SchoolDeliveryStats {
  school: string;
  total: number;
  delivered: number;
  inTransit: number;
}

export interface DeliveriesReport {
  total: number;
  deliveredCount: number;
  onTimeRate: number | null;
  avgDeliveryTimeMin: number | null;
  bySchool: SchoolDeliveryStats[];
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export interface ProductSnapshot {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  isCritical: boolean;
}

export interface StockAlert {
  id: string;
  name: string;
  stock: number;
  minStock: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalRequested: number;
}

export interface StockMovementEntry {
  id: string;
  productId: string;
  productName: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  notes?: string;
  timestamp: string;
}

export interface StockReport {
  products: ProductSnapshot[];
  alerts: StockAlert[];
  movementCount: number;
  movements: StockMovementEntry[];
  topProducts: TopProduct[];
}

// ─── Driver Performance ───────────────────────────────────────────────────────

export interface DriverPerformance {
  driverId: string;
  driverName: string;
  totalDeliveries: number;
  deliveredCount: number;
  onTimeCount: number;
  onTimeRate: number | null;
  avgDeliveryTimeMin: number | null;
  occurrenceCount: number;
}

// ─── Divergences ──────────────────────────────────────────────────────────────

export interface DivergentItem {
  productName: string;
  approvedQuantity: number;
  divergenceType: 'missing' | 'partial';
}

export interface DivergenceRecord {
  orderId: string;
  requestProtocol: string;
  school: string;
  driverName: string;
  deliveredAt: string;
  items: DivergentItem[];
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  schoolId?: string;
  driverId?: string;
}
