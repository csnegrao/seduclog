import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { findAllRequests } from '../models/request.model';
import { findAllOrders } from '../models/delivery.model';
import { findAllProducts, findLowStockProducts } from '../models/product.model';
import { findAllMovements } from '../models/stockMovement.model';
import { findAllOccurrences } from '../models/occurrence.model';
import { findUsersByRole } from '../models/user.model';
import { RequestStatus, DeliveryOrder } from '../types';

// ─── Shared helpers ───────────────────────────────────────────────────────────

interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  schoolId?: string;
  driverId?: string;
}

function parseFilters(query: Record<string, string | undefined>): ReportFilters {
  const filters: ReportFilters = {};

  if (query.startDate) {
    const d = new Date(query.startDate);
    if (!isNaN(d.getTime())) filters.startDate = d;
  }
  if (query.endDate) {
    const d = new Date(query.endDate);
    if (!isNaN(d.getTime())) {
      // include the full endDate day
      d.setHours(23, 59, 59, 999);
      filters.endDate = d;
    }
  }
  if (query.schoolId) filters.schoolId = query.schoolId;
  if (query.driverId) filters.driverId = query.driverId;

  return filters;
}

function filterOrders(orders: DeliveryOrder[], filters: ReportFilters): DeliveryOrder[] {
  return orders.filter((o) => {
    if (filters.startDate && o.createdAt < filters.startDate) return false;
    if (filters.endDate && o.createdAt > filters.endDate) return false;
    if (filters.schoolId && o.school !== filters.schoolId) return false;
    if (filters.driverId && o.driverId !== filters.driverId) return false;
    return true;
  });
}

/** Returns the delivery time in minutes, or null if not delivered. */
function deliveryMinutes(order: DeliveryOrder): number | null {
  if (order.status !== 'delivered' || !order.deliveredAt) return null;
  return Math.round((order.deliveredAt.getTime() - order.createdAt.getTime()) / 60_000);
}

// ─── GET /api/reports/summary ─────────────────────────────────────────────────

/**
 * Returns total requests grouped by status for an optional date range.
 * Also returns a daily breakdown for the period (delivery volume per day).
 */
export function getSummaryHandler(req: AuthenticatedRequest, res: Response): void {
  const filters = parseFilters(req.query as Record<string, string | undefined>);

  const allRequests = findAllRequests({
    from: filters.startDate,
    to: filters.endDate,
    school: filters.schoolId,
  });

  // Requests by status
  const byStatus: Record<string, number> = {};
  const STATUSES: RequestStatus[] = [
    'pending', 'approved', 'in_progress', 'in_transit', 'delivered', 'cancelled',
  ];
  for (const s of STATUSES) byStatus[s] = 0;
  for (const r of allRequests) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }

  // Daily delivered volume
  const deliveredOrders = filterOrders(findAllOrders(), { ...filters }).filter(
    (o) => o.status === 'delivered' && o.deliveredAt,
  );
  const dailyMap: Record<string, number> = {};
  for (const o of deliveredOrders) {
    const day = o.deliveredAt!.toISOString().slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + 1;
  }
  const dailyVolume = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.status(200).json({
    summary: {
      totalRequests: allRequests.length,
      byStatus,
      dailyVolume,
    },
  });
}

// ─── GET /api/reports/deliveries ─────────────────────────────────────────────

/**
 * Delivery performance: on-time rate, average delivery time, totals by school.
 * "On-time" is defined as delivered within 24 hours of creation (configurable).
 */
export function getDeliveriesReportHandler(req: AuthenticatedRequest, res: Response): void {
  const filters = parseFilters(req.query as Record<string, string | undefined>);
  const orders = filterOrders(findAllOrders(), filters);

  const delivered = orders.filter((o) => o.status === 'delivered');
  const total = orders.length;
  const deliveredCount = delivered.length;

  const ON_TIME_THRESHOLD_MIN = 60 * 24; // 24 hours
  let onTimeCount = 0;
  let totalMinutes = 0;
  let minuteCount = 0;

  for (const o of delivered) {
    const mins = deliveryMinutes(o);
    if (mins !== null) {
      totalMinutes += mins;
      minuteCount += 1;
      if (mins <= ON_TIME_THRESHOLD_MIN) onTimeCount += 1;
    }
  }

  const avgDeliveryTimeMin =
    minuteCount > 0 ? Math.round(totalMinutes / minuteCount) : null;
  const onTimeRate =
    deliveredCount > 0 ? Math.round((onTimeCount / deliveredCount) * 100) : null;

  // Totals by school
  const bySchool: Record<string, { total: number; delivered: number; inTransit: number }> = {};
  for (const o of orders) {
    if (!bySchool[o.school]) {
      bySchool[o.school] = { total: 0, delivered: 0, inTransit: 0 };
    }
    bySchool[o.school].total += 1;
    if (o.status === 'delivered') bySchool[o.school].delivered += 1;
    if (o.status === 'in_transit') bySchool[o.school].inTransit += 1;
  }

  const bySchoolArray = Object.entries(bySchool).map(([school, data]) => ({
    school,
    ...data,
  }));

  res.status(200).json({
    deliveries: {
      total,
      deliveredCount,
      onTimeRate,
      avgDeliveryTimeMin,
      bySchool: bySchoolArray,
    },
  });
}

// ─── GET /api/reports/stock ───────────────────────────────────────────────────

/**
 * Stock snapshot: current levels, movements by period, top requested products.
 */
export function getStockReportHandler(req: AuthenticatedRequest, res: Response): void {
  const filters = parseFilters(req.query as Record<string, string | undefined>);

  // Current product levels
  const products = findAllProducts().map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    stock: p.stock,
    minStock: p.minStock,
    isCritical: p.stock <= p.minStock,
  }));

  // Low-stock alerts
  const alerts = findLowStockProducts().map((p) => ({
    id: p.id,
    name: p.name,
    stock: p.stock,
    minStock: p.minStock,
  }));

  // Movements in period
  const allMovements = findAllMovements();
  const movements = allMovements.filter((m) => {
    if (filters.startDate && m.timestamp < filters.startDate) return false;
    if (filters.endDate && m.timestamp > filters.endDate) return false;
    return true;
  });

  // Top requested products (based on approved request items)
  const allRequests = findAllRequests({
    from: filters.startDate,
    to: filters.endDate,
  });
  const requestedQtyMap: Record<string, { productName: string; totalRequested: number }> = {};
  for (const r of allRequests) {
    for (const item of r.items) {
      if (!requestedQtyMap[item.productId]) {
        requestedQtyMap[item.productId] = { productName: item.productName, totalRequested: 0 };
      }
      requestedQtyMap[item.productId].totalRequested += item.requestedQuantity;
    }
  }
  const topProducts = Object.entries(requestedQtyMap)
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.totalRequested - a.totalRequested)
    .slice(0, 10);

  res.status(200).json({
    stock: {
      products,
      alerts,
      movementCount: movements.length,
      movements,
      topProducts,
    },
  });
}

// ─── GET /api/reports/driver-performance ─────────────────────────────────────

/**
 * Per-driver metrics: total deliveries, occurrences, on-time rate.
 */
export function getDriverPerformanceHandler(req: AuthenticatedRequest, res: Response): void {
  const filters = parseFilters(req.query as Record<string, string | undefined>);
  const orders = filterOrders(findAllOrders(), filters);
  const occurrences = findAllOccurrences().filter((occ) => {
    if (filters.startDate && occ.timestamp < filters.startDate) return false;
    if (filters.endDate && occ.timestamp > filters.endDate) return false;
    if (filters.driverId && occ.driverId !== filters.driverId) return false;
    return true;
  });

  const drivers = findUsersByRole('driver');
  const driverMap = new Map(drivers.map((d) => [d.id, d.name]));

  const ON_TIME_THRESHOLD_MIN = 60 * 24;
  const perfMap: Record<
    string,
    {
      driverId: string;
      driverName: string;
      total: number;
      delivered: number;
      onTime: number;
      totalMinutes: number;
      minuteCount: number;
      occurrenceCount: number;
    }
  > = {};

  for (const o of orders) {
    if (!perfMap[o.driverId]) {
      perfMap[o.driverId] = {
        driverId: o.driverId,
        driverName: driverMap.get(o.driverId) ?? o.driverName,
        total: 0,
        delivered: 0,
        onTime: 0,
        totalMinutes: 0,
        minuteCount: 0,
        occurrenceCount: 0,
      };
    }
    const p = perfMap[o.driverId];
    p.total += 1;
    if (o.status === 'delivered') {
      p.delivered += 1;
      const mins = deliveryMinutes(o);
      if (mins !== null) {
        p.totalMinutes += mins;
        p.minuteCount += 1;
        if (mins <= ON_TIME_THRESHOLD_MIN) p.onTime += 1;
      }
    }
  }

  for (const occ of occurrences) {
    if (perfMap[occ.driverId]) {
      perfMap[occ.driverId].occurrenceCount += 1;
    }
  }

  const performance = Object.values(perfMap).map((p) => ({
    driverId: p.driverId,
    driverName: p.driverName,
    totalDeliveries: p.total,
    deliveredCount: p.delivered,
    onTimeCount: p.onTime,
    onTimeRate: p.delivered > 0 ? Math.round((p.onTime / p.delivered) * 100) : null,
    avgDeliveryTimeMin: p.minuteCount > 0 ? Math.round(p.totalMinutes / p.minuteCount) : null,
    occurrenceCount: p.occurrenceCount,
  }));

  res.status(200).json({ performance });
}

// ─── GET /api/reports/divergences ────────────────────────────────────────────

/**
 * All deliveries with missing or partial items in a given period.
 */
export function getDivergencesHandler(req: AuthenticatedRequest, res: Response): void {
  const filters = parseFilters(req.query as Record<string, string | undefined>);
  const orders = filterOrders(findAllOrders(), filters).filter(
    (o) => o.status === 'delivered',
  );

  const divergences: Array<{
    orderId: string;
    requestProtocol: string;
    school: string;
    driverName: string;
    deliveredAt: Date;
    items: Array<{
      productName: string;
      approvedQuantity: number;
      divergenceType: 'missing' | 'partial';
    }>;
  }> = [];

  for (const order of orders) {
    const divergentItems: Array<{
      productName: string;
      approvedQuantity: number;
      divergenceType: 'missing' | 'partial';
    }> = [];

    for (const item of order.picklist) {
      const approved = item.approvedQuantity;
      const picked = item.pickedQuantity ?? 0;

      if (picked === 0) {
        divergentItems.push({
          productName: item.productName,
          approvedQuantity: approved,
          divergenceType: 'missing',
        });
      } else if (picked < approved) {
        divergentItems.push({
          productName: item.productName,
          approvedQuantity: approved,
          divergenceType: 'partial',
        });
      }
    }

    if (divergentItems.length > 0) {
      divergences.push({
        orderId: order.id,
        requestProtocol: order.requestProtocol,
        school: order.school,
        driverName: order.driverName,
        deliveredAt: order.deliveredAt!,
        items: divergentItems,
      });
    }
  }

  res.status(200).json({ divergences });
}
