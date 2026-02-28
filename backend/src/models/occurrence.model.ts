import { Occurrence } from '../types';

// In-memory occurrence store — replace with a real database in production.
const occurrences: Occurrence[] = [];

export function createOccurrence(occ: Occurrence): Occurrence {
  occurrences.push(occ);
  return occ;
}

export function findOccurrencesByOrder(orderId: string): Occurrence[] {
  return occurrences.filter((o) => o.orderId === orderId);
}

export function findAllOccurrences(): Occurrence[] {
  return [...occurrences];
}
