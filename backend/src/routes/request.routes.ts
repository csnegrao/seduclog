import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createRequestSchema,
  approveRequestSchema,
  cancelRequestSchema,
} from '../schemas/request.schemas';
import {
  createRequestHandler,
  listRequestsHandler,
  getRequestHandler,
  approveRequestHandler,
  cancelRequestHandler,
  getTrackingHandler,
} from '../controllers/request.controller';

const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

const router = Router();

// Rate-limit first, then authenticate on all request routes.
router.use(requestLimiter, authenticate);

/** POST /api/requests — create new request (REQUESTER only) */
router.post('/', authorize('requester'), validate(createRequestSchema), createRequestHandler);

/** GET /api/requests — list with optional filters */
router.get('/', listRequestsHandler);

/** GET /api/requests/:id — request detail */
router.get('/:id', getRequestHandler);

/** GET /api/requests/:id/tracking — real-time tracking info for a request */
router.get('/:id/tracking', getTrackingHandler);

/** PATCH /api/requests/:id/approve — WAREHOUSE_OPERATOR or admin */
router.patch(
  '/:id/approve',
  authorize('warehouse_operator', 'admin'),
  validate(approveRequestSchema),
  approveRequestHandler,
);

/** PATCH /api/requests/:id/cancel — requester (own), warehouse_operator, or admin */
router.patch('/:id/cancel', validate(cancelRequestSchema), cancelRequestHandler);

export default router;
