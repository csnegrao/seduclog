import { Request, Response } from 'express';
import { PrismaClient, RequestStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

export async function listRequests(req: Request, res: Response): Promise<void> {
  const { role, userId } = req.user!;
  const where: Record<string, unknown> = {};

  // Requesters see only their own requests
  if (role === 'REQUESTER') {
    where.requesterId = userId;
  }

  const requests = await prisma.materialRequest.findMany({
    where,
    include: {
      requester: { select: { id: true, name: true, email: true, school: true } },
      items: {
        include: {
          material: { select: { id: true, name: true, unit: true } },
        },
      },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(requests);
}

export async function getRequest(req: Request, res: Response): Promise<void> {
  const request = await prisma.materialRequest.findUnique({
    where: { id: req.params.id },
    include: {
      requester: { select: { id: true, name: true, email: true, school: true } },
      items: {
        include: {
          material: { select: { id: true, name: true, unit: true, currentStock: true } },
        },
      },
      pickingOrder: {
        include: {
          operator: { select: { id: true, name: true } },
          delivery: true,
        },
      },
    },
  });

  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  // Requesters can only see their own
  if (req.user!.role === 'REQUESTER' && request.requesterId !== req.user!.userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(request);
}

export async function createRequest(req: Request, res: Response): Promise<void> {
  const { items, priority, notes, destination } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Items array is required' });
    return;
  }

  const request = await prisma.materialRequest.create({
    data: {
      requesterId: req.user!.userId,
      priority: priority as Priority || 'NORMAL',
      notes,
      destination,
      items: {
        create: items.map((item: { materialId: string; quantity: number; notes?: string }) => ({
          materialId: item.materialId,
          quantity: item.quantity,
          notes: item.notes,
        })),
      },
    },
    include: {
      items: {
        include: { material: { select: { id: true, name: true, unit: true } } },
      },
    },
  });

  res.status(201).json(request);
}

export async function updateRequestStatus(req: Request, res: Response): Promise<void> {
  const { status, notes } = req.body;
  const { role } = req.user!;

  // Only operators/admin can approve/reject; requesters can cancel their own
  const allowedTransitions: Record<string, RequestStatus[]> = {
    ADMIN: ['APPROVED', 'IN_PICKING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
    WAREHOUSE_OPERATOR: ['APPROVED', 'IN_PICKING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
    REQUESTER: ['CANCELLED'],
    DRIVER: ['DISPATCHED', 'DELIVERED'],
    MANAGER: [],
  };

  const allowed = allowedTransitions[role] || [];
  if (!allowed.includes(status as RequestStatus)) {
    res.status(403).json({ error: 'Not allowed to set this status' });
    return;
  }

  try {
    const request = await prisma.materialRequest.update({
      where: { id: req.params.id },
      data: { status: status as RequestStatus, ...(notes && { notes }) },
    });
    res.json(request);
  } catch {
    res.status(404).json({ error: 'Request not found' });
  }
}

export async function deleteRequest(req: Request, res: Response): Promise<void> {
  const request = await prisma.materialRequest.findUnique({ where: { id: req.params.id } });
  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }
  if (request.status !== 'PENDING') {
    res.status(400).json({ error: 'Can only delete pending requests' });
    return;
  }

  await prisma.requestItem.deleteMany({ where: { requestId: req.params.id } });
  await prisma.materialRequest.delete({ where: { id: req.params.id } });
  res.json({ message: 'Request deleted' });
}
