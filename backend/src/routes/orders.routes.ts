import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
} from '../controllers/orders.controller';

const router = Router();

router.use(authenticate);
router.get('/', listOrders);
router.get('/:id', getOrder);
router.post('/', authorize('WAREHOUSE_OPERATOR', 'ADMIN'), createOrder);
router.patch('/:id/status', authorize('WAREHOUSE_OPERATOR', 'ADMIN'), updateOrderStatus);
router.delete('/:id', authorize('ADMIN'), deleteOrder);

export default router;
