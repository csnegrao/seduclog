import { DeliveryOrder, DeliveryOrderStatus } from '../types';

// In-memory delivery order store — replace with a real database in production.
const orders: DeliveryOrder[] = [];

export function createOrder(order: DeliveryOrder): DeliveryOrder {
  orders.push(order);
  return order;
}

export function findOrderById(id: string): DeliveryOrder | undefined {
  return orders.find((o) => o.id === id);
}

export function findOrderByRequestId(requestId: string): DeliveryOrder | undefined {
  return orders.find((o) => o.requestId === requestId);
}

export function findAllOrders(): DeliveryOrder[] {
  return [...orders];
}

export function saveOrder(updated: DeliveryOrder): DeliveryOrder {
  const idx = orders.findIndex((o) => o.id === updated.id);
  if (idx === -1) throw new Error(`Order "${updated.id}" not found in store`);
  orders[idx] = updated;
  return updated;
}

export function findOrdersByStatus(status: DeliveryOrderStatus): DeliveryOrder[] {
  return orders.filter((o) => o.status === status);
}

export function findOrdersByDriver(driverId: string): DeliveryOrder[] {
  return orders.filter((o) => o.driverId === driverId);
}
