import { randomUUID } from 'crypto';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { findOrdersByDriver, findOrderById, saveOrder } from '../models/delivery.model';
import { findRequestById, saveRequest } from '../models/request.model';
import { findUserById } from '../models/user.model';
import { findProductById, incrementStock } from '../models/product.model';
import { logRouteUpdate } from '../models/routeUpdate.model';
import { createOccurrence } from '../models/occurrence.model';
import { logMovement } from '../models/stockMovement.model';
import { emitDriverLocation, emitDeliveryConfirmed, emitRequestUpdated } from '../utils/socket';
import {
  RequestHistoryEntry,
  PickupBody,
  LocationBody,
  OccurrenceBody,
  DeliverBody,
  StockMovement,
} from '../types';

/**
 * Strips the `data:<mime>;base64,` prefix from a base64 data URL.
 * Returns the raw base64 string suitable for storage.
 */
function stripDataUrlPrefix(dataUrl: string): string {
  return dataUrl.replace(/^data:[^;]+;base64,/, '');
}

// ─── GET /api/driver/orders ───────────────────────────────────────────────────

/** Returns all delivery orders assigned to the authenticated driver. */
export function listDriverOrdersHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const orders = findOrdersByDriver(user.userId);
  res.status(200).json({ orders });
}

// ─── PATCH /api/driver/orders/:id/pickup ─────────────────────────────────────

/**
 * Driver confirms pickup from warehouse.
 * Accepts an optional base64 photo.
 * Moves order from 'picking' / 'ready' to 'in_transit'.
 */
export function pickupOrderHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const { id } = req.params;
  const body = req.body as PickupBody;

  const order = findOrderById(id);
  if (!order) {
    res.status(404).json({ message: 'Delivery order not found' });
    return;
  }

  if (order.driverId !== user.userId) {
    res.status(403).json({ message: 'This order is not assigned to you' });
    return;
  }

  if (order.status !== 'picking' && order.status !== 'ready' && order.status !== 'created') {
    res.status(409).json({
      message: `Cannot confirm pickup for order with status "${order.status}"`,
    });
    return;
  }

  const now = new Date();

  // In production, upload body.photoBase64 to S3/Cloudinary and store the URL.
  const pickupPhotoUrl = body.photoBase64
    ? `data:image/jpeg;base64,${stripDataUrlPrefix(body.photoBase64)}`
    : undefined;

  const updatedOrder = saveOrder({
    ...order,
    status: 'in_transit',
    pickupPhotoUrl,
    updatedAt: now,
  });

  // Update the linked request to in_transit.
  const materialRequest = findRequestById(order.requestId);
  if (materialRequest && materialRequest.status === 'in_progress') {
    const driver = findUserById(user.userId);
    const driverName = driver?.name ?? user.email;

    const historyEntry: RequestHistoryEntry = {
      id: randomUUID(),
      status: 'in_transit',
      changedBy: user.userId,
      changedByName: driverName,
      notes: 'Driver confirmed pickup from warehouse',
      timestamp: now,
    };

    const updatedRequest = saveRequest({
      ...materialRequest,
      status: 'in_transit',
      history: [...materialRequest.history, historyEntry],
      updatedAt: now,
    });

    emitRequestUpdated(updatedRequest);
  }

  res.status(200).json({ order: updatedOrder });
}

// ─── POST /api/driver/orders/:id/location ─────────────────────────────────────

/**
 * Receives lat/lng from driver, persists a RouteUpdate, calculates ETA if
 * GOOGLE_MAPS_API_KEY is configured, then emits "driver:location" event.
 */
export async function updateLocationHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const user = req.user!;
  const { id } = req.params;
  const body = req.body as LocationBody;

  if (!body.lat || !body.lng) {
    res.status(400).json({ message: 'lat and lng are required' });
    return;
  }

  const order = findOrderById(id);
  if (!order) {
    res.status(404).json({ message: 'Delivery order not found' });
    return;
  }

  if (order.driverId !== user.userId) {
    res.status(403).json({ message: 'This order is not assigned to you' });
    return;
  }

  let eta: number | undefined;

  // Attempt ETA calculation via Google Maps Distance Matrix API when key is available.
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (mapsKey && order.estimatedRoute) {
    try {
      const destination = encodeURIComponent(order.estimatedRoute);
      const origin = `${body.lat},${body.lng}`;
      const url =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${origin}&destinations=${destination}&key=${mapsKey}`;
      const response = await fetch(url);
      const data = (await response.json()) as {
        rows?: Array<{
          elements?: Array<{ duration?: { value?: number }; status?: string }>;
        }>;
      };
      const element = data.rows?.[0]?.elements?.[0];
      if (element?.status === 'OK' && element.duration?.value) {
        eta = Math.round(element.duration.value / 60); // seconds → minutes
      }
    } catch {
      // ETA calculation is best-effort; do not fail the request.
    }
  }

  const routeUpdate = logRouteUpdate({
    id: randomUUID(),
    orderId: id,
    driverId: user.userId,
    lat: body.lat,
    lng: body.lng,
    eta,
    timestamp: new Date(),
  });

  // Persist ETA on the order if it was calculated.
  if (eta !== undefined) {
    saveOrder({ ...order, eta, updatedAt: new Date() });
  }

  emitDriverLocation({ orderId: id, driverId: user.userId, lat: body.lat, lng: body.lng, eta });

  res.status(200).json({ routeUpdate });
}

// ─── POST /api/driver/orders/:id/occurrence ───────────────────────────────────

/** Registers an occurrence (incident/note) that happened during the route. */
export function reportOccurrenceHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const { id } = req.params;
  const body = req.body as OccurrenceBody;

  if (!body.description) {
    res.status(400).json({ message: 'description is required' });
    return;
  }

  const order = findOrderById(id);
  if (!order) {
    res.status(404).json({ message: 'Delivery order not found' });
    return;
  }

  if (order.driverId !== user.userId) {
    res.status(403).json({ message: 'This order is not assigned to you' });
    return;
  }

  const driver = findUserById(user.userId);
  const driverName = driver?.name ?? user.email;

  // In production, upload body.photoBase64 to S3/Cloudinary and store the URL.
  const photoUrl = body.photoBase64
    ? `data:image/jpeg;base64,${stripDataUrlPrefix(body.photoBase64)}`
    : undefined;

  const occurrence = createOccurrence({
    id: randomUUID(),
    orderId: id,
    driverId: user.userId,
    driverName,
    description: body.description,
    photoUrl,
    timestamp: new Date(),
  });

  res.status(201).json({ occurrence });
}

// ─── POST /api/driver/orders/:id/deliver ─────────────────────────────────────

/**
 * Final delivery confirmation.
 * - Accepts item checklist results, signature (base64), and optional photo.
 * - Stores media in-memory (production should use S3/Cloudinary).
 * - Updates DeliveryOrder and linked MaterialRequest to 'delivered'.
 * - Restores stock for undelivered / partially delivered items.
 * - Logs stock restoration as StockMovement entries.
 * - Emits "delivery:confirmed" socket event.
 */
export function deliverOrderHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const { id } = req.params;
  const body = req.body as DeliverBody;

  if (!body.signatureBase64) {
    res.status(400).json({ message: 'signatureBase64 is required' });
    return;
  }

  if (!body.items?.length) {
    res.status(400).json({ message: 'items checklist is required' });
    return;
  }

  const order = findOrderById(id);
  if (!order) {
    res.status(404).json({ message: 'Delivery order not found' });
    return;
  }

  if (order.driverId !== user.userId) {
    res.status(403).json({ message: 'This order is not assigned to you' });
    return;
  }

  if (order.status !== 'in_transit') {
    res.status(409).json({
      message: `Cannot confirm delivery for order with status "${order.status}"`,
    });
    return;
  }

  const driver = findUserById(user.userId);
  const driverName = driver?.name ?? user.email;
  const now = new Date();

  // Build a result map for quick lookup.
  const resultMap = new Map(body.items.map((i) => [i.itemId, i]));

  // Restore stock for undelivered / partially-delivered items and log movements.
  for (const plItem of order.picklist) {
    const result = resultMap.get(plItem.itemId);
    const approved = plItem.approvedQuantity;
    const delivered = result?.deliveredQuantity ?? 0;
    const restoreQty = approved - delivered;

    if (restoreQty > 0) {
      const product = findProductById(plItem.productId);
      const previousStock = product?.stock ?? 0;
      incrementStock(plItem.productId, restoreQty);
      const newStock = product?.stock ?? previousStock + restoreQty;

      const movement: StockMovement = {
        id: randomUUID(),
        productId: plItem.productId,
        productName: plItem.productName,
        type: 'entry',
        quantity: restoreQty,
        previousStock,
        newStock,
        notes: `Stock restored — undelivered quantity on order ${order.requestProtocol}`,
        performedBy: user.userId,
        performedByName: driverName,
        timestamp: now,
      };
      logMovement(movement);
    }
  }

  // In production, upload media to S3/Cloudinary and store URLs.
  const deliverySignature = `data:image/png;base64,${stripDataUrlPrefix(body.signatureBase64)}`;
  const deliveryPhotoUrl = body.photoBase64
    ? `data:image/jpeg;base64,${stripDataUrlPrefix(body.photoBase64)}`
    : undefined;

  const updatedOrder = saveOrder({
    ...order,
    status: 'delivered',
    deliverySignature,
    deliveryPhotoUrl,
    deliveryNotes: body.notes,
    deliveredAt: now,
    updatedAt: now,
  });

  // Update the linked MaterialRequest to 'delivered'.
  const materialRequest = findRequestById(order.requestId);
  if (materialRequest) {
    const historyEntry: RequestHistoryEntry = {
      id: randomUUID(),
      status: 'delivered',
      changedBy: user.userId,
      changedByName: driverName,
      notes: body.notes,
      timestamp: now,
    };

    const updatedRequest = saveRequest({
      ...materialRequest,
      status: 'delivered',
      history: [...materialRequest.history, historyEntry],
      updatedAt: now,
    });

    emitRequestUpdated(updatedRequest);
  }

  emitDeliveryConfirmed({ orderId: id, requestId: order.requestId });

  res.status(200).json({ order: updatedOrder });
}
