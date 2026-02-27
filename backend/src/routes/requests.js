const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createRequestSchema, updateRequestStatusSchema } = require('../schemas/requestSchemas');
const { createNotification } = require('../services/notificationService');

// GET /api/requests — list all requests (ADMIN and WAREHOUSE_OPERATOR see all; others see own)
router.get('/', authenticate, async (req, res) => {
  try {
    const where =
      req.user.role === 'ADMIN' || req.user.role === 'WAREHOUSE_OPERATOR'
        ? {}
        : { requesterId: req.user.id };

    const requests = await prisma.request.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        driver: { select: { id: true, name: true, email: true } },
        order: true,
        _count: { select: { messages: { where: { isRead: false } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/requests/:id — get a single request
router.get('/:id', authenticate, async (req, res) => {
  try {
    const request = await prisma.request.findUnique({
      where: { id: req.params.id },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        driver: { select: { id: true, name: true, email: true } },
        order: true,
      },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json(request);
  } catch {
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// POST /api/requests — create a request (REQUESTER / ADMIN)
router.post(
  '/',
  authenticate,
  authorize('REQUESTER', 'ADMIN'),
  validate(createRequestSchema),
  async (req, res) => {
    const { title, description } = req.body;
    try {
      const request = await prisma.request.create({
        data: { title, description, requesterId: req.user.id },
      });
      res.status(201).json(request);
    } catch {
      res.status(500).json({ error: 'Failed to create request' });
    }
  },
);

// PATCH /api/requests/:id/status — approve or reject (WAREHOUSE_OPERATOR / ADMIN)
router.patch(
  '/:id/status',
  authenticate,
  authorize('WAREHOUSE_OPERATOR', 'ADMIN'),
  validate(updateRequestStatusSchema),
  async (req, res) => {
    const { status } = req.body;
    const io = req.app.get('io');
    try {
      const request = await prisma.request.update({
        where: { id: req.params.id },
        data: { status },
        include: { requester: true },
      });

      // Notify requester
      if (status === 'APPROVED') {
        await createNotification(
          {
            userId: request.requesterId,
            type: 'REQUEST_APPROVED',
            title: 'Solicitação aprovada',
            message: `Sua solicitação "${request.title}" foi aprovada.`,
          },
          io,
        );
      } else if (status === 'REJECTED') {
        await createNotification(
          {
            userId: request.requesterId,
            type: 'REQUEST_REJECTED',
            title: 'Solicitação rejeitada',
            message: `Sua solicitação "${request.title}" foi rejeitada.`,
          },
          io,
        );
      } else if (status === 'DELIVERED') {
        await createNotification(
          {
            userId: request.requesterId,
            type: 'DELIVERY_CONFIRMED',
            title: 'Entrega confirmada',
            message: `Sua solicitação "${request.title}" foi entregue.`,
          },
          io,
        );
      }

      res.json(request);
    } catch {
      res.status(500).json({ error: 'Failed to update request status' });
    }
  },
);

module.exports = router;
