const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createOrderSchema, updateOrderStatusSchema } = require('../schemas/orderSchemas');
const { createNotification } = require('../services/notificationService');

// GET /api/orders — list orders
router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { request: { include: { requester: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/orders — create an order for a request (WAREHOUSE_OPERATOR / ADMIN)
router.post(
  '/',
  authenticate,
  authorize('WAREHOUSE_OPERATOR', 'ADMIN'),
  validate(createOrderSchema),
  async (req, res) => {
    const { requestId } = req.body;
    try {
      const request = await prisma.request.findUnique({ where: { id: requestId } });
      if (!request) return res.status(404).json({ error: 'Request not found' });

      const order = await prisma.order.create({ data: { requestId, status: 'PENDING' } });
      return res.status(201).json(order);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Order already exists for this request' });
      res.status(500).json({ error: 'Failed to create order' });
    }
  },
);

// PATCH /api/orders/:id/status — update order status (DRIVER / WAREHOUSE_OPERATOR / ADMIN)
router.patch(
  '/:id/status',
  authenticate,
  authorize('DRIVER', 'WAREHOUSE_OPERATOR', 'ADMIN'),
  validate(updateOrderStatusSchema),
  async (req, res) => {
    const { status, driverEta } = req.body;
    const io = req.app.get('io');
    try {
      const order = await prisma.order.update({
        where: { id: req.params.id },
        data: {
          status,
          ...(driverEta ? { driverEta: new Date(driverEta) } : {}),
        },
        include: {
          request: { include: { requester: true, driver: true } },
        },
      });

      const request = order.request;

      if (status === 'DISPATCHED') {
        await createNotification(
          {
            userId: request.requesterId,
            type: 'ORDER_DISPATCHED',
            title: 'Pedido despachado',
            message: `Seu pedido para "${request.title}" saiu para entrega.`,
          },
          io,
        );
      } else if (status === 'DELIVERED') {
        await createNotification(
          {
            userId: request.requesterId,
            type: 'DELIVERY_CONFIRMED',
            title: 'Entrega confirmada',
            message: `Seu pedido para "${request.title}" foi entregue.`,
          },
          io,
        );
      }

      // Check driver ETA — notify if less than 15 minutes away
      if (driverEta) {
        const etaDate = new Date(driverEta);
        const nowDate = new Date();
        const diffMinutes = (etaDate - nowDate) / 60000;
        if (diffMinutes > 0 && diffMinutes < 15) {
          await createNotification(
            {
              userId: request.requesterId,
              type: 'DRIVER_ARRIVING',
              title: 'Motorista chegando',
              message: `O motorista chegará em ${Math.round(diffMinutes)} minuto(s).`,
            },
            io,
          );
        }
      }

      res.json(order);
    } catch {
      res.status(500).json({ error: 'Failed to update order status' });
    }
  },
);

module.exports = router;
