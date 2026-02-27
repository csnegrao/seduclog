import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  listMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  createMovement,
  listMovements,
  getStockAlerts,
} from '../controllers/stock.controller';

const router = Router();

router.use(authenticate);

router.get('/materials', listMaterials);
router.get('/materials/alerts', getStockAlerts);
router.get('/materials/:id', getMaterial);
router.post('/materials', authorize('ADMIN', 'WAREHOUSE_OPERATOR'), createMaterial);
router.put('/materials/:id', authorize('ADMIN', 'WAREHOUSE_OPERATOR'), updateMaterial);

router.get('/movements', listMovements);
router.post('/movements', authorize('ADMIN', 'WAREHOUSE_OPERATOR'), createMovement);

export default router;
