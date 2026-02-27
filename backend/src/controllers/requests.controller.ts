import { Request, Response } from 'express';
import { PrismaClient, RequestStatus } from '@prisma/client';
import { getIO } from '../services/socket.service';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate protocol number in format REQ-YYYY-NNNNNN.
 * Counts existing requests for the current year and increments.
 */
async function generateProtocol(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;

  const latest = await prisma.materialRequest.findFirst({
    where: { protocol: { startsWith: prefix } },
    orderBy: { protocol: 'desc' },
    select: { protocol: true },
  });

  let seq = 1;
  if (latest) {
    const parts = latest.protocol.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(6, '0')}`;
}

/** Emit "request:updated" Socket.io event to all connected clients */
function emitRequestUpdated(requestId: string, status: RequestStatus) {
  const io = getIO();
  if (io) {
    io.emit('request:updated', { requestId, status });
  }
}

const REQUEST_INCLUDE = {
  requester: { select: { id: true, name: true, email: true, school: true } },
  items: {
    include: {
      material: { select: { id: true, name: true, unit: true, currentStock: true } },
    },
  },
};

// ---------------------------------------------------------------------------
// POST /api/requests
// ---------------------------------------------------------------------------

export async function createRequest(req: Request, res: Response): Promise<void> {
  const { items, desiredDate, justification, notes } = req.body as {
    items?: { materialId: string; requestedQty: number; notes?: string }[];
    desiredDate?: string;
    justification?: string;
    notes?: string;
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'At least one item is required' });
    return;
  }

  if (!desiredDate) {
    res.status(400).json({ error: 'desiredDate is required' });
    return;
  }

  if (!justification || justification.trim().length < 10) {
    res.status(400).json({ error: 'justification must have at least 10 characters' });
    return;
  }

  for (const item of items) {
    if (!item.materialId || !item.requestedQty || item.requestedQty < 1) {
      res.status(400).json({ error: 'Each item requires a valid materialId and requestedQty >= 1' });
      return;
    }
  }

  // Validate stock availability for all items
  const materialIds = items.map((i) => i.materialId);
  const materials = await prisma.material.findMany({
    where: { id: { in: materialIds }, active: true },
  });

  if (materials.length !== materialIds.length) {
    res.status(400).json({ error: 'One or more materials not found or inactive' });
    return;
  }

  const stockErrors: string[] = [];
  for (const item of items) {
    const mat = materials.find((m) => m.id === item.materialId);
    if (mat && mat.currentStock < item.requestedQty) {
      stockErrors.push(
        `Insufficient stock for "${mat.name}": requested ${item.requestedQty}, available ${mat.currentStock}`
      );
    }
  }

  if (stockErrors.length > 0) {
    res.status(422).json({ error: 'Stock validation failed', details: stockErrors });
    return;
  }

  const protocol = await generateProtocol();
  const requesterId = req.user!.userId;

  const request = await prisma.materialRequest.create({
    data: {
      protocol,
      requesterId,
      status: RequestStatus.PENDING,
      desiredDate: new Date(desiredDate),
      justification: justification.trim(),
      notes: notes?.trim(),
      items: {
        create: items.map((item) => ({
          materialId: item.materialId,
          requestedQty: item.requestedQty,
          notes: item.notes,
        })),
      },
      history: {
        create: [
          {
            userId: requesterId,
            status: RequestStatus.PENDING,
            notes: 'Pedido criado.',
          },
        ],
      },
    },
    include: {
      ...REQUEST_INCLUDE,
      history: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  emitRequestUpdated(request.id, request.status);

  res.status(201).json(request);
}

// ---------------------------------------------------------------------------
// GET /api/requests
// ---------------------------------------------------------------------------

export async function listRequests(req: Request, res: Response): Promise<void> {
  const { role, userId } = req.user!;

  const {
    status,
    school,
    requesterId: filterRequester,
    from,
    to,
  } = req.query as Record<string, string | undefined>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  // REQUESTER sees only their own
  if (role === 'REQUESTER') {
    where.requesterId = userId;
  } else if (filterRequester) {
    where.requesterId = filterRequester;
  }

  if (status) {
    where.status = status as RequestStatus;
  }

  if (school) {
    where.requester = { school: { contains: school, mode: 'insensitive' } };
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const requests = await prisma.materialRequest.findMany({
    where,
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  res.json(requests);
}

// ---------------------------------------------------------------------------
// GET /api/requests/:id
// ---------------------------------------------------------------------------

export async function getRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const request = await prisma.materialRequest.findUnique({
    where: { id },
    include: {
      ...REQUEST_INCLUDE,
      history: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      messages: {
        include: { sender: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  // REQUESTER can only see their own
  if (req.user!.role === 'REQUESTER' && request.requesterId !== req.user!.userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(request);
}

// ---------------------------------------------------------------------------
// PATCH /api/requests/:id/approve  (WAREHOUSE_OPERATOR only)
// ---------------------------------------------------------------------------

export async function approveRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { items, notes } = req.body as {
    items?: { id: string; approvedQty: number }[];
    notes?: string;
  };

  const existing = await prisma.materialRequest.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  if (existing.status !== RequestStatus.PENDING) {
    res.status(400).json({ error: `Cannot approve a request with status "${existing.status}"` });
    return;
  }

  // Build a map of approved quantities; default to requestedQty if not specified
  const approvalMap: Record<string, number> = {};
  if (items && Array.isArray(items)) {
    for (const ai of items) {
      approvalMap[ai.id] = ai.approvedQty;
    }
  }

  const operatorId = req.user!.userId;

  await prisma.$transaction(async (tx) => {
    // Update each item's approvedQty and deduct stock
    for (const item of existing.items) {
      const approvedQty =
        approvalMap[item.id] !== undefined ? approvalMap[item.id] : item.requestedQty;

      if (approvedQty < 0) {
        throw new Error(`approvedQty for item ${item.id} cannot be negative`);
      }

      await tx.requestItem.update({
        where: { id: item.id },
        data: { approvedQty },
      });

      if (approvedQty > 0) {
        // Deduct stock and record movement
        await tx.material.update({
          where: { id: item.materialId },
          data: { currentStock: { decrement: approvedQty } },
        });
        await tx.stockMovement.create({
          data: {
            materialId: item.materialId,
            type: 'OUT',
            quantity: approvedQty,
            reason: `Aprovação de pedido ${existing.protocol}`,
            reference: existing.id,
            userId: operatorId,
          },
        });
      }
    }

    await tx.materialRequest.update({
      where: { id },
      data: { status: RequestStatus.APPROVED, notes: notes ?? existing.notes },
    });

    await tx.requestHistory.create({
      data: {
        requestId: id,
        userId: operatorId,
        status: RequestStatus.APPROVED,
        notes: notes || 'Pedido aprovado pelo almoxarife.',
      },
    });
  });

  const updated = await prisma.materialRequest.findUnique({
    where: { id },
    include: {
      ...REQUEST_INCLUDE,
      history: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  emitRequestUpdated(id, RequestStatus.APPROVED);

  res.json(updated);
}

// ---------------------------------------------------------------------------
// PATCH /api/requests/:id/cancel  (requester cancels their own PENDING request)
// ---------------------------------------------------------------------------

export async function cancelRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { notes } = req.body as { notes?: string };
  const { userId, role } = req.user!;

  const existing = await prisma.materialRequest.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  // Only the requester or admin can cancel; only PENDING requests can be cancelled
  if (role === 'REQUESTER' && existing.requesterId !== userId) {
    res.status(403).json({ error: 'You can only cancel your own requests' });
    return;
  }

  if (existing.status !== RequestStatus.PENDING) {
    res.status(400).json({ error: `Cannot cancel a request with status "${existing.status}"` });
    return;
  }

  await prisma.$transaction([
    prisma.materialRequest.update({
      where: { id },
      data: { status: RequestStatus.CANCELLED },
    }),
    prisma.requestHistory.create({
      data: {
        requestId: id,
        userId,
        status: RequestStatus.CANCELLED,
        notes: notes || 'Pedido cancelado pelo solicitante.',
      },
    }),
  ]);

  const updated = await prisma.materialRequest.findUnique({
    where: { id },
    include: REQUEST_INCLUDE,
  });

  emitRequestUpdated(id, RequestStatus.CANCELLED);

  res.json(updated);
}

// ---------------------------------------------------------------------------
// POST /api/requests/:id/messages  (send a message in the thread)
// ---------------------------------------------------------------------------

export async function addMessage(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { body } = req.body as { body?: string };

  if (!body || body.trim().length === 0) {
    res.status(400).json({ error: 'Message body is required' });
    return;
  }

  const request = await prisma.materialRequest.findUnique({ where: { id } });
  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  const message = await prisma.message.create({
    data: {
      requestId: id,
      senderId: req.user!.userId,
      body: body.trim(),
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  // Notify via socket
  const io = getIO();
  if (io) {
    io.emit('request:message', { requestId: id, message });
  }

  res.status(201).json(message);
}

// ---------------------------------------------------------------------------
// PATCH /api/requests/:id/status  (admin/operator update to IN_PROGRESS/IN_TRANSIT/DELIVERED)
// ---------------------------------------------------------------------------

export async function updateRequestStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, notes, driverLat, driverLng } = req.body as {
    status?: RequestStatus;
    notes?: string;
    driverLat?: number;
    driverLng?: number;
  };

  const { role, userId } = req.user!;

  const allowedByRole: Record<string, RequestStatus[]> = {
    ADMIN: [RequestStatus.IN_PROGRESS, RequestStatus.IN_TRANSIT, RequestStatus.DELIVERED, RequestStatus.CANCELLED],
    WAREHOUSE_OPERATOR: [RequestStatus.IN_PROGRESS, RequestStatus.IN_TRANSIT, RequestStatus.DELIVERED],
    DRIVER: [RequestStatus.IN_TRANSIT, RequestStatus.DELIVERED],
  };

  const allowed = allowedByRole[role] ?? [];
  if (!status || !allowed.includes(status)) {
    res.status(403).json({ error: 'Not allowed to set this status' });
    return;
  }

  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  const updateData: Record<string, unknown> = { status };
  if (driverLat !== undefined) updateData.driverLat = driverLat;
  if (driverLng !== undefined) updateData.driverLng = driverLng;

  await prisma.$transaction([
    prisma.materialRequest.update({ where: { id }, data: updateData }),
    prisma.requestHistory.create({
      data: { requestId: id, userId, status, notes },
    }),
  ]);

  const updated = await prisma.materialRequest.findUnique({
    where: { id },
    include: REQUEST_INCLUDE,
  });

  emitRequestUpdated(id, status);

  res.json(updated);
}
