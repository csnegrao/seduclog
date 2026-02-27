import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  listMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createMovement,
  listMovements,
  getStockAlerts,
  getDashboardReport,
} from '../controllers/stock.controller';

const router = Router();

router.use(authenticate);

// Materials
router.get('/materials', listMaterials);
router.get('/materials/alerts', getStockAlerts);
router.get('/materials/:id', getMaterial);
router.post('/materials', authorize('WAREHOUSE_OPERATOR', 'ADMIN'), createMaterial);
router.put('/materials/:id', authorize('WAREHOUSE_OPERATOR', 'ADMIN'), updateMaterial);
router.delete('/materials/:id', authorize('ADMIN'), deleteMaterial);

// Movements
router.get('/movements', listMovements);
router.post('/movements', authorize('WAREHOUSE_OPERATOR', 'ADMIN'), createMovement);

// Reports
router.get('/reports/dashboard', authorize('ADMIN', 'MANAGER', 'WAREHOUSE_OPERATOR'), getDashboardReport);

export default router;
