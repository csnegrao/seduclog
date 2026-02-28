import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  getQueueHandler,
  createDeliveryOrderHandler,
  startPickingHandler,
  getStockHandler,
  createStockMovementHandler,
  getStockAlertsHandler,
  startInventoryHandler,
  reconcileInventoryHandler,
  getDriversAndVehiclesHandler,
} from '../controllers/warehouse.controller';

const warehouseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

const router = Router();

// Rate-limit first, then authenticate on all warehouse routes.
router.use(warehouseLimiter, authenticate);

// Only warehouse_operator and admin may access these routes.
const warehouseAuth = authorize('warehouse_operator', 'admin');

/** GET /api/warehouse/queue — pending + approved requests sorted by priority/date */
router.get('/queue', warehouseAuth, getQueueHandler);

/** POST /api/warehouse/orders — create delivery order */
router.post('/orders', warehouseAuth, createDeliveryOrderHandler);

/** PATCH /api/warehouse/orders/:id/start-picking — mark order as picking */
router.patch('/orders/:id/start-picking', warehouseAuth, startPickingHandler);

/** GET /api/warehouse/stock — full product list with stock levels */
router.get('/stock', warehouseAuth, getStockHandler);

/** GET /api/warehouse/stock/alerts — low-stock products */
router.get('/stock/alerts', warehouseAuth, getStockAlertsHandler);

/** POST /api/warehouse/stock/movement — register stock entry */
router.post('/stock/movement', warehouseAuth, createStockMovementHandler);

/** POST /api/warehouse/inventory — start inventory session */
router.post('/inventory', warehouseAuth, startInventoryHandler);

/** PATCH /api/warehouse/inventory/:id/reconcile — submit physical counts */
router.patch('/inventory/:id/reconcile', warehouseAuth, reconcileInventoryHandler);

/** GET /api/warehouse/drivers — available drivers and vehicles */
router.get('/drivers', warehouseAuth, getDriversAndVehiclesHandler);

export default router;
