import { format } from 'date-fns';
import type {
  KPIData,
  FiltersData,
  SummaryData,
  DeliveriesData,
  StockData,
  DriverPerfData,
  DivergencesData,
  Filters,
} from '../types';

function buildParams(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', format(filters.startDate, "yyyy-MM-dd'T'00:00:00"));
  if (filters.endDate) params.set('endDate', format(filters.endDate, "yyyy-MM-dd'T'23:59:59"));
  if (filters.schoolId) params.set('schoolId', filters.schoolId);
  if (filters.driverId) params.set('driverId', filters.driverId);
  return params.toString();
}

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

export const fetchFilters = (): Promise<FiltersData> => get('/filters');

export const fetchKPI = (): Promise<KPIData> => get('/dashboard');

export const fetchSummary = (filters: Filters): Promise<SummaryData> =>
  get(`/reports/summary?${buildParams(filters)}`);

export const fetchDeliveries = (filters: Filters): Promise<DeliveriesData> =>
  get(`/reports/deliveries?${buildParams(filters)}`);

export const fetchStock = (filters: Filters): Promise<StockData> =>
  get(`/reports/stock?${buildParams(filters)}`);

export const fetchDriverPerf = (filters: Filters): Promise<DriverPerfData> =>
  get(`/reports/driver-performance?${buildParams(filters)}`);

export const fetchDivergences = (filters: Filters): Promise<DivergencesData> =>
  get(`/reports/divergences?${buildParams(filters)}`);
