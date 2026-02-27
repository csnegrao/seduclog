export interface School {
  id: number;
  name: string;
  city: string;
}

export interface Driver {
  id: number;
  name: string;
}

export interface FiltersData {
  schools: School[];
  drivers: Driver[];
}

export interface KPIData {
  open_requests: number;
  in_transit: number;
  delivered_today: number;
  critical_stock_alerts: number;
}

export interface SummaryData {
  summary: { open: number; in_transit: number; delivered: number; cancelled: number };
  period: { start: string; end: string };
}

export interface DailyVolume {
  day: string;
  count: number;
}

export interface DeliveryBySchool {
  school: string;
  count: number;
  on_time: number;
}

export interface DeliveriesData {
  total: number;
  on_time_rate: number;
  avg_delivery_hours: number;
  by_school: DeliveryBySchool[];
  daily_volume: DailyVolume[];
  period: { start: string; end: string };
}

export interface TopProduct {
  name: string;
  category: string;
  total_requested: number;
}

export interface StockLevel {
  id: number;
  name: string;
  category: string;
  total_quantity: number;
}

export interface CriticalStockItem {
  id: number;
  name: string;
  school_name: string;
  quantity: number;
}

export interface StockData {
  stock_levels: StockLevel[];
  top_products: TopProduct[];
  critical_stock: CriticalStockItem[];
  period: { start: string; end: string };
}

export interface DriverPerf {
  id: number;
  driver_name: string;
  total_deliveries: number;
  delivered: number;
  on_time: number;
  cancelled: number;
  on_time_rate: number;
}

export interface DriverPerfData {
  drivers: DriverPerf[];
  period: { start: string; end: string };
}

export interface Divergence {
  request_id: number;
  school_name: string;
  driver_name: string | null;
  delivered_at: string;
  product_name: string;
  quantity_requested: number;
  quantity_delivered: number | null;
  missing_quantity: number;
}

export interface DivergencesData {
  divergences: Divergence[];
  total: number;
  period: { start: string; end: string };
}

export interface Filters {
  startDate: Date | null;
  endDate: Date | null;
  schoolId: string;
  driverId: string;
}
