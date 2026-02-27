import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getQueue,
  createOrder,
  startPicking,
  confirmChecklistItem,
  getStock,
  createStockMovement,
  getStockAlerts,
  startInventory,
  listInventorySessions,
  getInventorySession,
  reconcileInventory,
  listVehicles,
  listDrivers,
} from '../controllers/warehouse.controller';

const router = Router();
router.use(authenticate);
router.use(authorize('WAREHOUSE_OPERATOR', 'ADMIN'));

// Queue
router.get('/queue', getQueue);

// Orders
router.post('/orders', createOrder);
router.patch('/orders/:id/start-picking', startPicking);
router.patch('/orders/:id/checklist/:itemId', confirmChecklistItem);

// Stock
router.get('/stock', getStock);
router.post('/stock/movement', createStockMovement);
router.get('/stock/alerts', getStockAlerts);

// Inventory
router.get('/inventory', listInventorySessions);
router.post('/inventory', startInventory);
router.get('/inventory/:id', getInventorySession);
router.patch('/inventory/:id/reconcile', reconcileInventory);

// Resources
router.get('/vehicles', listVehicles);
router.get('/drivers', listDrivers);

export default router;
