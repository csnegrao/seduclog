import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  listDriverOrdersHandler,
  pickupOrderHandler,
  updateLocationHandler,
  reportOccurrenceHandler,
  deliverOrderHandler,
} from '../controllers/driver.controller';

const driverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

const router = Router();

// Rate-limit first, then authenticate on all driver routes.
router.use(driverLimiter, authenticate);

// Only drivers and admin may access these routes.
const driverAuth = authorize('driver', 'admin');

/** GET /api/driver/orders — list orders assigned to the authenticated driver */
router.get('/orders', driverAuth, listDriverOrdersHandler);

/** PATCH /api/driver/orders/:id/pickup — confirm pickup from warehouse */
router.patch('/orders/:id/pickup', driverAuth, pickupOrderHandler);

/** POST /api/driver/orders/:id/location — update driver GPS position */
router.post('/orders/:id/location', driverAuth, updateLocationHandler);

/** POST /api/driver/orders/:id/occurrence — register a route occurrence */
router.post('/orders/:id/occurrence', driverAuth, reportOccurrenceHandler);

/** POST /api/driver/orders/:id/deliver — final delivery confirmation */
router.post('/orders/:id/deliver', driverAuth, deliverOrderHandler);

export default router;
