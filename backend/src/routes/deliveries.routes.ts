import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  listDeliveries,
  getDelivery,
  createDelivery,
  updateDeliveryStatus,
  saveSignature,
} from '../controllers/deliveries.controller';

const router = Router();

router.use(authenticate);
router.get('/', listDeliveries);
router.get('/:id', getDelivery);
router.post('/', authorize('WAREHOUSE_OPERATOR', 'ADMIN'), createDelivery);
router.patch('/:id/status', authorize('DRIVER', 'WAREHOUSE_OPERATOR', 'ADMIN'), updateDeliveryStatus);
router.post('/:id/signature', authorize('DRIVER', 'WAREHOUSE_OPERATOR', 'ADMIN'), saveSignature);

export default router;
