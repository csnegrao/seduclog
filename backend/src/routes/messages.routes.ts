import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { getThreadHandler, sendMessageHandler } from '../controllers/messages.controller';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

const router = Router();

router.use(limiter, authenticate);

/** GET /api/messages/:requestId — load full message thread */
router.get(
  '/:requestId',
  authorize('requester', 'warehouse_operator', 'manager', 'admin'),
  getThreadHandler,
);

/** POST /api/messages/:requestId — send a message in a thread */
router.post(
  '/:requestId',
  authorize('requester', 'warehouse_operator', 'manager', 'admin'),
  sendMessageHandler,
);

export default router;
