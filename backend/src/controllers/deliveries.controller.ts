import { Request, Response } from 'express';
import { PrismaClient, DeliveryStatus } from '@prisma/client';
import { getIO } from '../services/socket.service';

const prisma = new PrismaClient();

export async function listDeliveries(req: Request, res: Response): Promise<void> {
  const { role, userId } = req.user!;
  const where: Record<string, unknown> = {};
  if (role === 'DRIVER') {
    where.driverId = userId;
  }

  const deliveries = await prisma.delivery.findMany({
    where,
    include: {
      driver: { select: { id: true, name: true, phone: true } },
      pickingOrder: {
        include: {
          request: {
            include: {
              requester: { select: { id: true, name: true, school: true } },
              items: { include: { material: { select: { id: true, name: true, unit: true } } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(deliveries);
}

export async function getDelivery(req: Request, res: Response): Promise<void> {
  const delivery = await prisma.delivery.findUnique({
    where: { id: req.params.id },
    include: {
      driver: { select: { id: true, name: true, phone: true } },
      pickingOrder: {
        include: {
          request: {
            include: {
              requester: { select: { id: true, name: true, school: true } },
              items: { include: { material: { select: { id: true, name: true, unit: true } } } },
            },
          },
        },
      },
    },
  });

  if (!delivery) {
    res.status(404).json({ error: 'Delivery not found' });
    return;
  }

  // Drivers can only see their own deliveries
  if (req.user!.role === 'DRIVER' && delivery.driverId !== req.user!.userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(delivery);
}

export async function createDelivery(req: Request, res: Response): Promise<void> {
  const { pickingOrderId, driverId, destination, destinationLat, destinationLng, notes } = req.body;

  if (!pickingOrderId) {
    res.status(400).json({ error: 'pickingOrderId is required' });
    return;
  }

  const delivery = await prisma.delivery.create({
    data: {
      pickingOrderId,
      driverId,
      destination,
      destinationLat,
      destinationLng,
      notes,
    },
  });

  // Mark request as DISPATCHED
  const order = await prisma.pickingOrder.findUnique({ where: { id: pickingOrderId } });
  if (order) {
    await prisma.materialRequest.update({
      where: { id: order.requestId },
      data: { status: 'DISPATCHED' },
    });
  }

  res.status(201).json(delivery);
}

export async function updateDeliveryStatus(req: Request, res: Response): Promise<void> {
  const { status, currentLat, currentLng, notes } = req.body;

  const updateData: Record<string, unknown> = { status: status as DeliveryStatus };
  if (currentLat !== undefined) updateData.currentLat = currentLat;
  if (currentLng !== undefined) updateData.currentLng = currentLng;
  if (notes) updateData.notes = notes;

  if (status === 'EN_ROUTE') updateData.startedAt = new Date();
  if (status === 'ARRIVED') updateData.arrivedAt = new Date();
  if (status === 'DELIVERED') {
    updateData.deliveredAt = new Date();
  }

  try {
    const delivery = await prisma.delivery.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // Emit real-time update
    const io = getIO();
    if (io) {
      io.emit('delivery:updated', { deliveryId: delivery.id, status, currentLat, currentLng });
    }

    // If delivered, update request status
    if (status === 'DELIVERED') {
      const order = await prisma.pickingOrder.findUnique({ where: { id: delivery.pickingOrderId } });
      if (order) {
        await prisma.materialRequest.update({
          where: { id: order.requestId },
          data: { status: 'DELIVERED' },
        });
      }
    }

    res.json(delivery);
  } catch {
    res.status(404).json({ error: 'Delivery not found' });
  }
}

export async function saveSignature(req: Request, res: Response): Promise<void> {
  const { signatureData, recipientName } = req.body;

  if (!signatureData) {
    res.status(400).json({ error: 'Signature data is required' });
    return;
  }

  try {
    const delivery = await prisma.delivery.update({
      where: { id: req.params.id },
      data: {
        signatureData,
        recipientName,
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    // Update related request
    const order = await prisma.pickingOrder.findUnique({ where: { id: delivery.pickingOrderId } });
    if (order) {
      await prisma.materialRequest.update({
        where: { id: order.requestId },
        data: { status: 'DELIVERED' },
      });
    }

    const io = getIO();
    if (io) {
      io.emit('delivery:signed', { deliveryId: delivery.id, recipientName });
    }

    res.json(delivery);
  } catch {
    res.status(404).json({ error: 'Delivery not found' });
  }
}
