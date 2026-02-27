const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createStockSchema, updateStockSchema } = require('../schemas/stockSchemas');
const { createNotification } = require('../services/notificationService');

// GET /api/stock — list all stock items
router.get('/', authenticate, async (req, res) => {
  try {
    const items = await prisma.stock.findMany({ orderBy: { productName: 'asc' } });
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

// POST /api/stock — create a stock item (WAREHOUSE_OPERATOR / ADMIN)
router.post(
  '/',
  authenticate,
  authorize('WAREHOUSE_OPERATOR', 'ADMIN'),
  validate(createStockSchema),
  async (req, res) => {
    const { productName, quantity, minimumQuantity } = req.body;
    try {
      const item = await prisma.stock.create({
        data: { productName, quantity, minimumQuantity },
      });
      res.status(201).json(item);
    } catch {
      res.status(500).json({ error: 'Failed to create stock item' });
    }
  },
);

// PATCH /api/stock/:id — update stock quantity (WAREHOUSE_OPERATOR / ADMIN)
router.patch(
  '/:id',
  authenticate,
  authorize('WAREHOUSE_OPERATOR', 'ADMIN'),
  validate(updateStockSchema),
  async (req, res) => {
    const { quantity, minimumQuantity } = req.body;
    const io = req.app.get('io');
    try {
      const item = await prisma.stock.update({
        where: { id: req.params.id },
        data: {
          ...(quantity !== undefined ? { quantity } : {}),
          ...(minimumQuantity !== undefined ? { minimumQuantity } : {}),
        },
      });

      // Notify operators if stock is below minimum
      if (item.quantity < item.minimumQuantity) {
        const operators = await prisma.user.findMany({
          where: { role: { in: ['WAREHOUSE_OPERATOR', 'ADMIN'] } },
          select: { id: true },
        });
        for (const op of operators) {
          await createNotification(
            {
              userId: op.id,
              type: 'STOCK_BELOW_MINIMUM',
              title: 'Estoque abaixo do mínimo',
              message: `O produto "${item.productName}" está abaixo do estoque mínimo (${item.quantity} / ${item.minimumQuantity}).`,
            },
            io,
          );
        }
      }

      res.json(item);
    } catch {
      res.status(500).json({ error: 'Failed to update stock item' });
    }
  },
);

module.exports = router;
