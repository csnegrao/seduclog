import { Request, Response } from 'express';
import { PrismaClient, MovementType, InventoryStatus } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/warehouse/queue - pending and approved requests ordered by priority and desired date
export async function getQueue(_req: Request, res: Response): Promise<void> {
  const requests = await prisma.materialRequest.findMany({
    where: {
      status: { in: ['PENDING', 'APPROVED'] },
    },
    include: {
      requester: { select: { id: true, name: true, school: true, email: true } },
      items: {
        include: { material: { select: { id: true, name: true, unit: true, currentStock: true } } },
      },
      pickingOrder: { select: { id: true, status: true } },
    },
    orderBy: [
      { priority: 'desc' },
      { desiredDate: 'asc' },
      { createdAt: 'asc' },
    ],
  });
  res.json(requests);
}

// POST /api/warehouse/orders - create delivery order assigning driver and vehicle
export async function createOrder(req: Request, res: Response): Promise<void> {
  const { requestId, driverId, vehicleId, destination, notes } = req.body;

  if (!requestId) {
    res.status(400).json({ error: 'requestId is required' });
    return;
  }

  const existingRequest = await prisma.materialRequest.findUnique({
    where: { id: requestId },
    include: { items: true },
  });

  if (!existingRequest) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  if (!['APPROVED', 'PENDING'].includes(existingRequest.status)) {
    res.status(400).json({ error: 'Request must be PENDING or APPROVED to create an order' });
    return;
  }

  const pickingOrder = await prisma.$transaction(async (tx) => {
    // Update request status
    await tx.materialRequest.update({
      where: { id: requestId },
      data: { status: 'IN_PICKING' },
    });

    // Create picking order
    const order = await tx.pickingOrder.create({
      data: {
        requestId,
        operatorId: req.user!.userId,
        notes,
        checklistItems: {
          create: existingRequest.items.map((item) => ({
            materialId: item.materialId,
            requiredQty: item.quantity,
          })),
        },
      },
      include: {
        request: {
          include: {
            requester: { select: { id: true, name: true, school: true } },
            items: { include: { material: true } },
          },
        },
        checklistItems: { include: { material: { select: { id: true, name: true, unit: true } } } },
      },
    });

    // If driver and vehicle provided, create delivery immediately
    if (driverId || vehicleId || destination) {
      await tx.delivery.create({
        data: {
          pickingOrderId: order.id,
          driverId: driverId || undefined,
          vehicleId: vehicleId || undefined,
          destination: destination || existingRequest.destination,
        },
      });
    }

    return order;
  });

  res.status(201).json(pickingOrder);
}

// PATCH /api/warehouse/orders/:id/start-picking - marks order as picking, triggers checklist generation
export async function startPicking(req: Request, res: Response): Promise<void> {
  try {
    const order = await prisma.pickingOrder.findUnique({
      where: { id: req.params.id },
      include: {
        request: { include: { items: true } },
        checklistItems: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Generate checklist if not already created
    if (order.checklistItems.length === 0) {
      await prisma.checklistItem.createMany({
        data: order.request.items.map((item) => ({
          pickingOrderId: order.id,
          materialId: item.materialId,
          requiredQty: item.quantity,
        })),
      });
    }

    const updatedOrder = await prisma.pickingOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'IN_PROGRESS',
        operatorId: req.user!.userId,
      },
      include: {
        checklistItems: {
          include: { material: { select: { id: true, name: true, unit: true, currentStock: true } } },
        },
        request: {
          include: {
            requester: { select: { id: true, name: true, school: true } },
            items: { include: { material: { select: { id: true, name: true, unit: true } } } },
          },
        },
      },
    });

    res.json(updatedOrder);
  } catch {
    res.status(404).json({ error: 'Order not found' });
  }
}

// PATCH /api/warehouse/orders/:id/checklist/:itemId - confirm a checklist item
export async function confirmChecklistItem(req: Request, res: Response): Promise<void> {
  const { confirmedQty } = req.body;
  try {
    const item = await prisma.checklistItem.update({
      where: { id: req.params.itemId },
      data: {
        confirmed: true,
        confirmedQty: confirmedQty,
        confirmedAt: new Date(),
      },
    });
    res.json(item);
  } catch {
    res.status(404).json({ error: 'Checklist item not found' });
  }
}

// GET /api/warehouse/stock - full product list with current stock levels
export async function getStock(_req: Request, res: Response): Promise<void> {
  const materials = await prisma.material.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json(materials);
}

// POST /api/warehouse/stock/movement - register stock entry (supplier delivery with invoice reference)
export async function createStockMovement(req: Request, res: Response): Promise<void> {
  const { materialId, type, quantity, reason, reference, invoiceRef } = req.body;

  if (!materialId || !type || !quantity) {
    res.status(400).json({ error: 'materialId, type and quantity are required' });
    return;
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }

  let stockDelta = 0;
  if (type === 'IN') stockDelta = quantity;
  else if (type === 'OUT') stockDelta = -quantity;
  else if (type === 'ADJUSTMENT') stockDelta = quantity; // can be negative

  const newStock = material.currentStock + stockDelta;
  if (newStock < 0) {
    res.status(400).json({ error: 'Insufficient stock' });
    return;
  }

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        materialId,
        type: type as MovementType,
        quantity,
        reason,
        reference,
        invoiceRef,
        userId: req.user!.userId,
      },
    }),
    prisma.material.update({
      where: { id: materialId },
      data: { currentStock: newStock },
    }),
  ]);

  res.status(201).json({ movement, newStock });
}

// GET /api/warehouse/stock/alerts - products below minimum stock
export async function getStockAlerts(_req: Request, res: Response): Promise<void> {
  const materials = await prisma.material.findMany({
    where: {
      active: true,
      minStock: { gt: 0 },
    },
    orderBy: { currentStock: 'asc' },
  });

  const lowStock = materials.filter((m) => m.currentStock <= m.minStock);
  res.json(lowStock);
}

// POST /api/warehouse/inventory - start inventory session
export async function startInventory(req: Request, res: Response): Promise<void> {
  const { notes } = req.body;

  // Get all active materials for the inventory
  const materials = await prisma.material.findMany({
    where: { active: true },
  });

  const session = await prisma.inventorySession.create({
    data: {
      operatorId: req.user!.userId,
      status: 'OPEN' as InventoryStatus,
      notes,
      items: {
        create: materials.map((m) => ({
          materialId: m.id,
          systemQty: m.currentStock,
        })),
      },
    },
    include: {
      operator: { select: { id: true, name: true } },
      items: {
        include: { material: { select: { id: true, name: true, unit: true, category: true } } },
      },
    },
  });

  res.status(201).json(session);
}

// GET /api/warehouse/inventory - list inventory sessions
export async function listInventorySessions(_req: Request, res: Response): Promise<void> {
  const sessions = await prisma.inventorySession.findMany({
    include: {
      operator: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(sessions);
}

// GET /api/warehouse/inventory/:id - get inventory session details
export async function getInventorySession(req: Request, res: Response): Promise<void> {
  const session = await prisma.inventorySession.findUnique({
    where: { id: req.params.id },
    include: {
      operator: { select: { id: true, name: true } },
      items: {
        include: { material: { select: { id: true, name: true, unit: true, category: true, currentStock: true } } },
      },
    },
  });

  if (!session) {
    res.status(404).json({ error: 'Inventory session not found' });
    return;
  }
  res.json(session);
}

// PATCH /api/warehouse/inventory/:id/reconcile - submit physical count and auto-calculate adjustments
export async function reconcileInventory(req: Request, res: Response): Promise<void> {
  const { items } = req.body; // [{ itemId: string, physicalQty: number }]

  if (!items || !Array.isArray(items)) {
    res.status(400).json({ error: 'items array is required' });
    return;
  }

  const session = await prisma.inventorySession.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });

  if (!session) {
    res.status(404).json({ error: 'Inventory session not found' });
    return;
  }

  if (session.status === 'CLOSED') {
    res.status(400).json({ error: 'Inventory session is already closed' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const { itemId, physicalQty } of items) {
      const invItem = session.items.find((i) => i.id === itemId);
      if (!invItem) continue;

      const adjustment = physicalQty - invItem.systemQty;

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          physicalQty,
          adjustment,
          reconciled: true,
          reconciledAt: new Date(),
        },
      });

      // If there's a discrepancy, log a stock movement
      if (adjustment !== 0) {
        await tx.stockMovement.create({
          data: {
            materialId: invItem.materialId,
            type: 'ADJUSTMENT',
            quantity: adjustment,
            reason: `Inventory reconciliation - session ${session.id}`,
            reference: `INV-${session.id}`,
            userId: req.user!.userId,
          },
        });

        // Update material stock
        await tx.material.update({
          where: { id: invItem.materialId },
          data: { currentStock: { increment: adjustment } },
        });
      }
    }

    // Close the session
    await tx.inventorySession.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  });

  const updatedSession = await prisma.inventorySession.findUnique({
    where: { id: req.params.id },
    include: {
      operator: { select: { id: true, name: true } },
      items: {
        include: { material: { select: { id: true, name: true, unit: true, category: true } } },
      },
    },
  });

  res.json(updatedSession);
}

// GET /api/warehouse/vehicles - list available vehicles
export async function listVehicles(_req: Request, res: Response): Promise<void> {
  const vehicles = await prisma.vehicle.findMany({
    where: { active: true },
    orderBy: { model: 'asc' },
  });
  res.json(vehicles);
}

// GET /api/warehouse/drivers - list available drivers
export async function listDrivers(_req: Request, res: Response): Promise<void> {
  const drivers = await prisma.user.findMany({
    where: { role: 'DRIVER', active: true },
    select: { id: true, name: true, phone: true, email: true },
    orderBy: { name: 'asc' },
  });
  res.json(drivers);
}
