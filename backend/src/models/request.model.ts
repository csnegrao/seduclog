import { MaterialRequest, RequestStatus } from '../types';

// In-memory request store — replace with a real database in production.
const requests: MaterialRequest[] = [];

// Protocol counter per calendar year: REQ-YYYY-NNNNNN
const yearCounters: Record<number, number> = {};

export function generateProtocol(): string {
  const year = new Date().getFullYear();
  yearCounters[year] = (yearCounters[year] ?? 0) + 1;
  const seq = String(yearCounters[year]).padStart(6, '0');
  return `REQ-${year}-${seq}`;
}

export function createRequest(request: MaterialRequest): MaterialRequest {
  requests.push(request);
  return request;
}

export function findRequestById(id: string): MaterialRequest | undefined {
  return requests.find((r) => r.id === id);
}

export interface RequestFilters {
  status?: RequestStatus;
  school?: string;
  from?: Date;
  to?: Date;
  requesterId?: string;
}

export function findAllRequests(filters: RequestFilters = {}): MaterialRequest[] {
  return requests.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.school && r.school !== filters.school) return false;
    if (filters.requesterId && r.requesterId !== filters.requesterId) return false;
    if (filters.from && r.createdAt < filters.from) return false;
    if (filters.to && r.createdAt > filters.to) return false;
    return true;
  });
}

export function saveRequest(updated: MaterialRequest): MaterialRequest {
  const idx = requests.findIndex((r) => r.id === updated.id);
  if (idx === -1) throw new Error(`Request "${updated.id}" not found in store`);
  requests[idx] = updated;
  return updated;
}
