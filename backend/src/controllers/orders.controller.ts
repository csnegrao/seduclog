import { Request, Response } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function listOrders(req: Request, res: Response): Promise<void> {
  const { role, userId } = req.user!;
  const where: Record<string, unknown> = {};
  if (role === 'WAREHOUSE_OPERATOR') {
    where.OR = [{ operatorId: userId }, { operatorId: null }];
  }

  const orders = await prisma.pickingOrder.findMany({
    where,
    include: {
      request: {
        include: {
          requester: { select: { id: true, name: true, school: true } },
          items: {
            include: { material: { select: { id: true, name: true, unit: true } } },
          },
        },
      },
      operator: { select: { id: true, name: true } },
      delivery: { select: { id: true, status: true, driverId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const order = await prisma.pickingOrder.findUnique({
    where: { id: req.params.id },
    include: {
      request: {
        include: {
          requester: { select: { id: true, name: true, school: true } },
          items: {
            include: { material: { select: { id: true, name: true, unit: true, currentStock: true } } },
          },
        },
      },
      operator: { select: { id: true, name: true } },
      delivery: true,
    },
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(order);
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const { requestId, notes } = req.body;

  if (!requestId) {
    res.status(400).json({ error: 'requestId is required' });
    return;
  }

  // Update request status to IN_PICKING
  await prisma.materialRequest.update({
    where: { id: requestId },
    data: { status: 'IN_PICKING' },
  });

  const order = await prisma.pickingOrder.create({
    data: {
      requestId,
      operatorId: req.user!.userId,
      notes,
    },
    include: {
      request: {
        include: {
          items: { include: { material: true } },
        },
      },
    },
  });

  res.status(201).json(order);
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const { status, notes } = req.body;

  try {
    const order = await prisma.pickingOrder.update({
      where: { id: req.params.id },
      data: {
        status: status as OrderStatus,
        ...(notes && { notes }),
        ...(status === 'IN_PROGRESS' && { operatorId: req.user!.userId }),
      },
    });

    // If order completed, mark request as READY
    if (status === 'COMPLETED') {
      await prisma.materialRequest.update({
        where: { id: order.requestId },
        data: { status: 'READY' },
      });
    }

    res.json(order);
  } catch {
    res.status(404).json({ error: 'Order not found' });
  }
}

export async function deleteOrder(req: Request, res: Response): Promise<void> {
  try {
    await prisma.pickingOrder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Order deleted' });
  } catch {
    res.status(404).json({ error: 'Order not found' });
  }
}
