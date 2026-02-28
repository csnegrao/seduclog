import { randomUUID } from 'crypto';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { findAllRequests, findRequestById, saveRequest } from '../models/request.model';
import { findAllProducts, findProductById, findLowStockProducts, incrementStock, setProductStock } from '../models/product.model';
import { findUserById, findUsersByRole } from '../models/user.model';
import { findVehicleById, findAvailableVehicles, setVehicleAvailability } from '../models/vehicle.model';
import { createOrder, findOrderById, saveOrder } from '../models/delivery.model';
import { logMovement } from '../models/stockMovement.model';
import { createSession, findSessionById, saveSession } from '../models/inventory.model';
import { emitRequestUpdated } from '../utils/socket';
import {
  DeliveryOrder,
  PicklistItem,
  RequestHistoryEntry,
  StockMovement,
  InventorySession,
  InventoryItem,
  CreateDeliveryOrderBody,
  StockMovementBody,
  ReconcileInventoryBody,
} from '../types';

// ─── GET /api/warehouse/queue ─────────────────────────────────────────────────

/**
 * Returns pending and approved requests ordered by desired date (soonest first).
 */
export function getQueueHandler(_req: AuthenticatedRequest, res: Response): void {
  const queue = findAllRequests({})
    .filter((r) => r.status === 'pending' || r.status === 'approved')
    .sort((a, b) => {
      const da = new Date(a.desiredDate).getTime();
      const db = new Date(b.desiredDate).getTime();
      return da - db;
    });

  res.status(200).json({ queue });
}

// ─── POST /api/warehouse/orders ───────────────────────────────────────────────

/**
 * Creates a delivery order assigning a driver and vehicle to an approved request.
 */
export function createDeliveryOrderHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const body = req.body as CreateDeliveryOrderBody;

  if (!body.requestId || !body.driverId || !body.vehicleId) {
    res.status(400).json({ message: 'requestId, driverId, and vehicleId are required' });
    return;
  }

  const materialRequest = findRequestById(body.requestId);
  if (!materialRequest) {
    res.status(404).json({ message: 'Request not found' });
    return;
  }

  if (materialRequest.status !== 'approved') {
    res.status(409).json({
      message: `Cannot create delivery order for request with status "${materialRequest.status}"`,
    });
    return;
  }

  const driver = findUserById(body.driverId);
  if (!driver || driver.role !== 'driver') {
    res.status(400).json({ message: 'Driver not found or user is not a driver' });
    return;
  }

  const vehicle = findVehicleById(body.vehicleId);
  if (!vehicle) {
    res.status(400).json({ message: 'Vehicle not found' });
    return;
  }

  if (!vehicle.available) {
    res.status(409).json({ message: `Vehicle "${vehicle.plate}" is not available` });
    return;
  }

  // Build picklist from approved request items.
  const picklist: PicklistItem[] = materialRequest.items.map((item) => ({
    itemId: item.id,
    productId: item.productId,
    productName: item.productName,
    unit: item.unit,
    approvedQuantity: item.approvedQuantity ?? item.requestedQuantity,
    confirmed: false,
  }));

  const now = new Date();

  const order: DeliveryOrder = {
    id: randomUUID(),
    requestId: materialRequest.id,
    requestProtocol: materialRequest.protocol,
    driverId: driver.id,
    driverName: driver.name,
    vehicleId: vehicle.id,
    vehiclePlate: vehicle.plate,
    status: 'created',
    picklist,
    estimatedRoute: body.estimatedRoute,
    createdAt: now,
    updatedAt: now,
  };

  const savedOrder = createOrder(order);

  // Mark vehicle as unavailable and update request to in_progress.
  setVehicleAvailability(vehicle.id, false);

  const operator = findUserById(user.userId);
  const operatorName = operator?.name ?? user.email;

  const historyEntry: RequestHistoryEntry = {
    id: randomUUID(),
    status: 'in_progress',
    changedBy: user.userId,
    changedByName: operatorName,
    notes: `Delivery order created. Driver: ${driver.name}, Vehicle: ${vehicle.plate}`,
    timestamp: now,
  };

  const updatedRequest = saveRequest({
    ...materialRequest,
    status: 'in_progress',
    history: [...materialRequest.history, historyEntry],
    updatedAt: now,
  });

  emitRequestUpdated(updatedRequest);

  res.status(201).json({ order: savedOrder });
}

// ─── PATCH /api/warehouse/orders/:id/start-picking ───────────────────────────

/**
 * Marks a delivery order as 'picking' and returns the generated checklist.
 */
export function startPickingHandler(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;

  const order = findOrderById(id);
  if (!order) {
    res.status(404).json({ message: 'Delivery order not found' });
    return;
  }

  if (order.status !== 'created') {
    res.status(409).json({
      message: `Cannot start picking for order with status "${order.status}"`,
    });
    return;
  }

  const now = new Date();
  const updated = saveOrder({ ...order, status: 'picking', updatedAt: now });

  res.status(200).json({ order: updated });
}

// ─── GET /api/warehouse/stock ─────────────────────────────────────────────────

/** Returns the full product list. Supports optional `search` and `category` query params. */
export function getStockHandler(req: AuthenticatedRequest, res: Response): void {
  const { search, category } = req.query as Record<string, string | undefined>;
  const products = findAllProducts(search, category);
  res.status(200).json({ products });
}

// ─── POST /api/warehouse/stock/movement ───────────────────────────────────────

/**
 * Registers a stock entry from a supplier delivery.
 * All stock movements are logged in the StockMovement log.
 */
export function createStockMovementHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const body = req.body as StockMovementBody;

  if (!body.productId || !body.quantity || body.quantity < 1) {
    res.status(400).json({ message: 'productId and a positive quantity are required' });
    return;
  }

  const product = findProductById(body.productId);
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  const previousStock = product.stock;
  incrementStock(body.productId, body.quantity);
  const newStock = product.stock;

  const performer = findUserById(user.userId);
  const performerName = performer?.name ?? user.email;

  const movement: StockMovement = {
    id: randomUUID(),
    productId: product.id,
    productName: product.name,
    type: 'entry',
    quantity: body.quantity,
    previousStock,
    newStock,
    invoiceRef: body.invoiceRef,
    notes: body.notes,
    performedBy: user.userId,
    performedByName: performerName,
    timestamp: new Date(),
  };

  const logged = logMovement(movement);

  res.status(201).json({ movement: logged });
}

// ─── GET /api/warehouse/stock/alerts ─────────────────────────────────────────

/** Returns products whose current stock is at or below their minimum stock level. */
export function getStockAlertsHandler(_req: AuthenticatedRequest, res: Response): void {
  const alerts = findLowStockProducts();
  res.status(200).json({ alerts });
}

// ─── POST /api/warehouse/inventory ───────────────────────────────────────────

/** Starts a new inventory session, capturing current system stock for all products. */
export function startInventoryHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;

  const allProducts = findAllProducts();
  const items: InventoryItem[] = allProducts.map((p) => ({
    productId: p.id,
    productName: p.name,
    systemStock: p.stock,
  }));

  const starter = findUserById(user.userId);
  const starterName = starter?.name ?? user.email;

  const session: InventorySession = {
    id: randomUUID(),
    status: 'open',
    items,
    startedBy: user.userId,
    startedByName: starterName,
    createdAt: new Date(),
  };

  const saved = createSession(session);

  res.status(201).json({ inventory: saved });
}

// ─── PATCH /api/warehouse/inventory/:id/reconcile ─────────────────────────────

/**
 * Submits physical counts for an open inventory session.
 * Auto-calculates adjustments and applies them to product stocks.
 * Logs every adjustment as a StockMovement.
 */
export function reconcileInventoryHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const { id } = req.params;
  const body = req.body as ReconcileInventoryBody;

  if (!body.counts?.length) {
    res.status(400).json({ message: 'counts array is required' });
    return;
  }

  const session = findSessionById(id);
  if (!session) {
    res.status(404).json({ message: 'Inventory session not found' });
    return;
  }

  if (session.status !== 'open') {
    res.status(409).json({ message: 'Inventory session is already reconciled' });
    return;
  }

  const reconciler = findUserById(user.userId);
  const reconcilerName = reconciler?.name ?? user.email;
  const now = new Date();

  // Build a map for quick lookup.
  const countMap = new Map<string, number>(body.counts.map((c) => [c.productId, c.physicalCount]));

  const updatedItems: InventoryItem[] = session.items.map((item) => {
    const physical = countMap.get(item.productId);
    if (physical === undefined) return item;

    const adjustment = physical - item.systemStock;

    const product = findProductById(item.productId);
    if (product) {
      const previousStock = product.stock;
      const newStock = physical;

      // Apply adjustment.
      if (adjustment !== 0) {
        setProductStock(item.productId, newStock);

        // Log the movement.
        logMovement({
          id: randomUUID(),
          productId: product.id,
          productName: product.name,
          type: 'adjustment',
          quantity: Math.abs(adjustment),
          previousStock,
          newStock,
          notes: `Inventory reconciliation — session ${id}`,
          performedBy: user.userId,
          performedByName: reconcilerName,
          timestamp: now,
        });
      }
    }

    return {
      ...item,
      physicalCount: physical,
      adjustment,
    };
  });

  const updatedSession: InventorySession = {
    ...session,
    status: 'reconciled',
    items: updatedItems,
    reconciledBy: user.userId,
    reconciledByName: reconcilerName,
    reconciledAt: now,
  };

  const saved = saveSession(updatedSession);

  res.status(200).json({ inventory: saved });
}

// ─── GET /api/warehouse/drivers ───────────────────────────────────────────────

/** Returns available drivers and all vehicles (for the assign-driver modal). */
export function getDriversAndVehiclesHandler(_req: AuthenticatedRequest, res: Response): void {
  const drivers = findUsersByRole('driver').map(({ id, name, email }) => ({ id, name, email }));
  const vehicles = findAvailableVehicles();
  res.status(200).json({ drivers, vehicles });
}
