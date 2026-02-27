import { Request, Response } from 'express';
import { PrismaClient, MovementType } from '@prisma/client';

const prisma = new PrismaClient();

export async function listMaterials(_req: Request, res: Response): Promise<void> {
  const materials = await prisma.material.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(materials);
}

export async function getMaterial(req: Request, res: Response): Promise<void> {
  const material = await prisma.material.findUnique({ where: { id: req.params.id } });
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  res.json(material);
}

export async function createMaterial(req: Request, res: Response): Promise<void> {
  const { name, description, unit, category, currentStock, minStock, maxStock, sku } = req.body;

  if (!name || !unit || !category) {
    res.status(400).json({ error: 'Name, unit and category are required' });
    return;
  }

  const material = await prisma.material.create({
    data: {
      name,
      description,
      unit,
      category,
      currentStock: currentStock ?? 0,
      minStock: minStock ?? 0,
      maxStock,
      sku,
    },
  });
  res.status(201).json(material);
}

export async function updateMaterial(req: Request, res: Response): Promise<void> {
  const { name, description, unit, category, minStock, maxStock, sku, active } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (unit !== undefined) data.unit = unit;
  if (category !== undefined) data.category = category;
  if (minStock !== undefined) data.minStock = minStock;
  if (maxStock !== undefined) data.maxStock = maxStock;
  if (sku !== undefined) data.sku = sku;
  if (active !== undefined) data.active = active;

  try {
    const material = await prisma.material.update({ where: { id: req.params.id }, data });
    res.json(material);
  } catch {
    res.status(404).json({ error: 'Material not found' });
  }
}

export async function deleteMaterial(req: Request, res: Response): Promise<void> {
  try {
    await prisma.material.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: 'Material deactivated' });
  } catch {
    res.status(404).json({ error: 'Material not found' });
  }
}

export async function createMovement(req: Request, res: Response): Promise<void> {
  const { materialId, type, quantity, reason, reference } = req.body;

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
  else if (type === 'ADJUSTMENT') stockDelta = quantity; // quantity can be negative

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

export async function listMovements(req: Request, res: Response): Promise<void> {
  const { materialId } = req.query;
  const where: Record<string, unknown> = {};
  if (materialId) where.materialId = materialId;

  const movements = await prisma.stockMovement.findMany({
    where,
    include: {
      material: { select: { id: true, name: true, unit: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(movements);
}

export async function getStockAlerts(_req: Request, res: Response): Promise<void> {
  const alerts = await prisma.material.findMany({
    where: {
      active: true,
      minStock: { gt: 0 },
    },
    orderBy: { currentStock: 'asc' },
  });

  const lowStock = alerts.filter((m) => m.currentStock <= m.minStock);
  res.json(lowStock);
}

export async function getDashboardReport(_req: Request, res: Response): Promise<void> {
  const [
    totalRequests,
    pendingRequests,
    inPickingOrders,
    activeDeliveries,
    deliveredToday,
  ] = await Promise.all([
    prisma.materialRequest.count(),
    prisma.materialRequest.count({ where: { status: 'PENDING' } }),
    prisma.pickingOrder.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
    prisma.delivery.count({ where: { status: { in: ['EN_ROUTE', 'ARRIVED'] } } }),
    prisma.delivery.count({
      where: {
        status: 'DELIVERED',
        deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  const lowStockResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM materials
    WHERE active = true AND min_stock > 0 AND current_stock <= min_stock`;
  const lowStockCount = Number(lowStockResult[0]?.count ?? 0);

  res.json({
    totalRequests,
    pendingRequests,
    inPickingOrders,
    activeDeliveries,
    deliveredToday,
    lowStockCount,
  });
}
