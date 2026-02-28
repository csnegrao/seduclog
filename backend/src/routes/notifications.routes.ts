import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import {
  listNotificationsHandler,
  markAllReadHandler,
} from '../controllers/notifications.controller';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

const router = Router();

// All notification routes require authentication.
router.use(limiter, authenticate);

/** GET /api/notifications — list authenticated user's notifications (unread first) */
router.get('/', listNotificationsHandler);

/** PATCH /api/notifications/read-all — mark all notifications as read */
router.patch('/read-all', markAllReadHandler);

export default router;
