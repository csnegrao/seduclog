import { Request, Response } from 'express';
import https from 'https';
import prisma from '../utils/prisma';
import { uploadToCloudinary } from '../utils/cloudinary';
import { getIO } from '../utils/socket';

// GET /api/driver/orders
export async function getOrders(req: Request, res: Response): Promise<void> {
  const driverId = req.user!.userId;

  const orders = await prisma.deliveryOrder.findMany({
    where: { driverId, status: { not: 'DELIVERED' } },
    include: {
      materialRequest: {
        include: {
          school: true,
          requestItems: { include: { product: true } },
        },
      },
      vehicle: true,
      routeUpdates: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ orders });
}

// PATCH /api/driver/orders/:id/pickup
export async function confirmPickup(req: Request, res: Response): Promise<void> {
  const driverId = req.user!.userId;
  const { id } = req.params;

  const order = await prisma.deliveryOrder.findUnique({ where: { id } });
  if (!order || order.driverId !== driverId) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  if (order.status !== 'ASSIGNED') {
    res.status(400).json({ error: 'Order is not in ASSIGNED status' });
    return;
  }

  let pickupPhotoUrl: string | undefined;
  if (req.file) {
    pickupPhotoUrl = await uploadToCloudinary(req.file.buffer, `pickup_${id}`);
  }

  const updated = await prisma.deliveryOrder.update({
    where: { id },
    data: {
      status: 'PICKED_UP',
      pickupPhotoUrl,
    },
  });

  res.json({ order: updated });
}

// POST /api/driver/orders/:id/location
export async function updateLocation(req: Request, res: Response): Promise<void> {
  const driverId = req.user!.userId;
  const { id } = req.params;
  const { lat, lng } = req.body as { lat?: number; lng?: number };

  if (lat === undefined || lng === undefined) {
    res.status(400).json({ error: 'lat and lng are required' });
    return;
  }

  const order = await prisma.deliveryOrder.findUnique({
    where: { id },
    include: { materialRequest: { include: { school: true } } },
  });
  if (!order || order.driverId !== driverId) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const school = order.materialRequest.school;
  let estimatedArrival: Date | undefined;

  if (school.lat && school.lng) {
    estimatedArrival = await calculateETA(lat, lng, school.lat, school.lng);
  }

  const routeUpdate = await prisma.routeUpdate.create({
    data: {
      deliveryOrderId: id,
      lat,
      lng,
      estimatedArrival,
    },
  });

  // Update order to IN_TRANSIT if still in PICKED_UP
  if (order.status === 'PICKED_UP') {
    await prisma.deliveryOrder.update({ where: { id }, data: { status: 'IN_TRANSIT' } });
  }

  const io = getIO();
  if (io) {
    io.emit('driver:location', {
      orderId: id,
      driverId,
      lat,
      lng,
      estimatedArrival,
    });
  }

  res.json({ routeUpdate });
}

// POST /api/driver/orders/:id/occurrence
export async function reportOccurrence(req: Request, res: Response): Promise<void> {
  const driverId = req.user!.userId;
  const { id } = req.params;
  const { description } = req.body as { description?: string };

  if (!description) {
    res.status(400).json({ error: 'description is required' });
    return;
  }

  const order = await prisma.deliveryOrder.findUnique({ where: { id } });
  if (!order || order.driverId !== driverId) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  let photoUrl: string | undefined;
  if (req.file) {
    photoUrl = await uploadToCloudinary(req.file.buffer, `occurrence_${id}_${Date.now()}`);
  }

  const occurrence = await prisma.occurrence.create({
    data: {
      deliveryOrderId: id,
      reportedById: driverId,
      description,
      photoUrl,
    },
  });

  res.status(201).json({ occurrence });
}

// POST /api/driver/orders/:id/deliver
export async function confirmDelivery(req: Request, res: Response): Promise<void> {
  const driverId = req.user!.userId;
  const { id } = req.params;
  const { checklist, notes, signature } = req.body as {
    checklist?: Array<{ requestItemId: string; status: string; actualQty?: number }>;
    notes?: string;
    signature?: string; // base64
  };

  if (!checklist || !Array.isArray(checklist) || checklist.length === 0) {
    res.status(400).json({ error: 'checklist is required' });
    return;
  }
  if (!signature) {
    res.status(400).json({ error: 'signature is required' });
    return;
  }

  const order = await prisma.deliveryOrder.findUnique({
    where: { id },
    include: { materialRequest: { include: { requestItems: true } } },
  });
  if (!order || order.driverId !== driverId) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Upload delivery photo if provided
  let deliveryPhotoUrl: string | undefined;
  if (req.file) {
    deliveryPhotoUrl = await uploadToCloudinary(req.file.buffer, `delivery_${id}`);
  }

  // Upload signature (base64)
  const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const signatureUrl = await uploadToCloudinary(signatureBuffer, `signature_${id}`);

  // Determine overall delivery status
  const allDelivered = checklist.every((item) => item.status === 'DELIVERED');
  const anyDelivered = checklist.some((item) => item.status === 'DELIVERED');
  const finalStatus = allDelivered ? 'DELIVERED' : anyDelivered ? 'PARTIAL' : 'PARTIAL';

  await prisma.$transaction(async (tx: typeof prisma) => {
    // Create checklist records
    for (const item of checklist) {
      await tx.deliveryChecklist.create({
        data: {
          deliveryOrderId: id,
          requestItemId: item.requestItemId,
          status: item.status as 'DELIVERED' | 'MISSING' | 'DIFFERENT_QTY',
          actualQty: item.actualQty,
        },
      });
    }

    // Update RequestItem deliveredQty and restore undelivered stock
    for (const item of checklist) {
      const reqItem = order.materialRequest.requestItems.find(
        (ri: { id: string; quantity: number; productId: string }) => ri.id === item.requestItemId,
      );
      if (!reqItem) continue;

      if (item.status === 'DELIVERED') {
        await tx.requestItem.update({
          where: { id: item.requestItemId },
          data: { deliveredQty: reqItem.quantity },
        });
      } else if (item.status === 'DIFFERENT_QTY' && item.actualQty !== undefined) {
        const delivered = item.actualQty;
        const undelivered = reqItem.quantity - delivered;

        await tx.requestItem.update({
          where: { id: item.requestItemId },
          data: { deliveredQty: delivered },
        });

        // Restore undelivered qty to stock
        if (undelivered > 0) {
          await tx.product.update({
            where: { id: reqItem.productId },
            data: { stock: { increment: undelivered } },
          });
          await tx.stockMovement.create({
            data: {
              productId: reqItem.productId,
              type: 'RETURN',
              quantity: undelivered,
              reason: `Partial delivery - order ${id}`,
            },
          });
        }
      } else if (item.status === 'MISSING') {
        // Return full quantity to stock
        await tx.product.update({
          where: { id: reqItem.productId },
          data: { stock: { increment: reqItem.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: reqItem.productId,
            type: 'RETURN',
            quantity: reqItem.quantity,
            reason: `Missing item - order ${id}`,
          },
        });
      }
    }

    // Update DeliveryOrder
    await tx.deliveryOrder.update({
      where: { id },
      data: {
        status: finalStatus,
        deliveryPhotoUrl,
        signatureUrl,
        notes,
      },
    });

    // Update MaterialRequest status
    await tx.materialRequest.update({
      where: { id: order.materialRequestId },
      data: { status: finalStatus === 'DELIVERED' ? 'DELIVERED' : 'PARTIAL' },
    });
  });

  const io = getIO();
  if (io) {
    io.emit('delivery:confirmed', { orderId: id, status: finalStatus });
  }

  res.json({ message: 'Delivery confirmed', status: finalStatus });
}

async function calculateETA(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<Date | undefined> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return undefined;

  return new Promise((resolve) => {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&key=${apiKey}`;

    https
      .get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk: string) => { data += chunk; });
        resp.on('end', () => {
          try {
            const json = JSON.parse(data) as {
              rows: Array<{ elements: Array<{ status: string; duration: { value: number } }> }>;
            };
            const element = json.rows?.[0]?.elements?.[0];
            if (element?.status === 'OK') {
              const seconds = element.duration.value;
              const eta = new Date(Date.now() + seconds * 1000);
              resolve(eta);
            } else {
              resolve(undefined);
            }
          } catch {
            resolve(undefined);
          }
        });
      })
      .on('error', () => resolve(undefined));
  });
}
