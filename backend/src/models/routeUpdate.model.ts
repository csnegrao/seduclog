import { RouteUpdate } from '../types';

// In-memory route update log — replace with a real database in production.
const updates: RouteUpdate[] = [];

export function logRouteUpdate(update: RouteUpdate): RouteUpdate {
  updates.push(update);
  return update;
}

export function findUpdatesByOrder(orderId: string): RouteUpdate[] {
  return updates.filter((u) => u.orderId === orderId);
}

/** Returns the most recent route update for a given order, or undefined. */
export function findLatestUpdate(orderId: string): RouteUpdate | undefined {
  const byOrder = updates.filter((u) => u.orderId === orderId);
  return byOrder[byOrder.length - 1];
}
